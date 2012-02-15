var util = require('util');

function parseRows(p_rows, total) {
  var list = [];
  // parse each row
  for (var i in p_rows) {
    list[i] = p_rows[i].value;
  }
  return {
    total: total,
    list: list
  };
}

module.exports = {
  // count list view's keys
  list_count: function(keyinfo, next) {
    // keyinfo:
    // [view "cate", key "20", sort "title_asc"]
    var self = this;
    var view = keyinfo[0];
    var key = keyinfo[1];
    var sort_dir = keyinfo[2];

    var all_counts_key = [self.dbname, 'list_count', view, sort_dir].join('-_-');
    var rows_info = central.cache.get(all_counts_key) || { _all_: {} };

    if (key && rows_info[key]) return next(null, rows_info[key]);

    var fil = {
      limit: 2,
      group: true,
      group_level: 1
    };
    if (key) fil.startkey = [key];

    self.db.view('list/' + view, fil, function(err, data) {
      if (err) {
        err = err.error || err;
        util.log('[err]'.red + ' get article list count ' + err.blue);
        return next(err);
      }

      data = data.rows;
      for (var i in data) {
        tmp = data[i];
        rows_info[tmp.key] = {
          total: tmp.value
        };
      }

      central.cache.save(all_counts_key, rows_info);

      next(null, rows_info[key]);
    });
  },
  list: function(keyinfo, next) {
    // keyinfo:
    // [view "cate", key "20", sort "default", page "40", perpage "20"]
    //
    // and the cache key looks like:
    // list-_-cate-_-20-_-40-_-20
    //
    // which is from request params:
    // list-_-{:view}-_-{:key}-_-{:sort}-_-{:page}-_-{:perpage}
    //
    var self = this;
    var view = keyinfo[0];
    var key = keyinfo[1];
    var sort = keyinfo[2];
    var page = keyinfo[3];
    var perpage = keyinfo[4];

    var tmp = sort.split('_');
    var descending = (tmp.length < 2 || (tmp[1] && tmp[1] != 'asc')) ? true : false;
    var sort_suffix = (tmp[0] && tmp[0] !== 'default') ? '_' + tmp[0] : '';

    view += sort_suffix;

    // get rows count
    // {
    //   _total: total_rows,
    //   "key1": {
    //      total: 200,
    //      10: [ ['key11', 'id11'], ['key21', 'id21'] ...],
    //      20: [ ['key21', 'id21'], ['key41', 'id41'] ...],
    //   },
    //   ...
    // }
    self.fetch(['list_count', view, key, descending], function(err, row_info) {
      if (err) return next(err);
      if (!row_info) return next(404);
      get_pagi(row_info);
    });

    var total, total_page, offset_docids;
    function get_pagi(row_info) {
      total = row_info.total;
      total_page = Math.ceil(total / perpage);
      // offset_docids = [k-p2, k-p3, k-p4 ...]
      offset_docids = row_info[perpage] || (row_info[perpage] = []);

      // page too large
      if (page > total_page) {
        return next(404);
      }

      var offset_keyinfo, idx = page - 2;
      var page_num = 1;
      // get the last indexed page
      while (idx >= 0 && !offset_keyinfo) {
        offset_keyinfo = offset_docids[idx];
        page_num++;
        idx--;
      }
      if (offset_keyinfo) page_num--;

      get_list(offset_keyinfo, page_num);
    }

    function get_list(offset_keyinfo, page_num) {
      var filter = {
        reduce: false,
        descending: descending,
        limit: (page_num || 1) * perpage + 1
      };

      // already know the key
      if (offset_keyinfo) {
        filter.startkey = offset_keyinfo[0];
        filter.startkey_docid = offset_keyinfo[1];
      } else if(descending && key) {
        filter.startkey = [key + 1];
      } else if (key) {
        filter.startkey = [key];
      }

      // get _design/list/_views/cate/?key=["01"]
      self.db.view('list/' + view, filter, function(err, data) {
        if (err) {
          err = err.error || err;
          util.log('[err]'.red + ' get article list ' + err.blue);
          return next(err);
        }
        next(err, parseData(data, page_num));
      });
    }

    // slice data to many page, and store it in cache
    function parseData(data, page_num) {
      var rows = data.rows;
      var p_rows, ndoc;

      // the start page
      var p = page - (page_num - 1);
      // stash all the previous pages
      while (p < page && rows.length) {
        p_rows = rows.splice(0, perpage);

        if (p) {
          // next page start doc
          ndoc = rows[0];
          if (ndoc) offset_docids[p - 1] = [ndoc.key, ndoc.id];
        }

        self.stash(['list', view, key, sort, p, perpage],
          parseRows(p_rows, total));
          p++;
      }

      // at the last page
      if (page == total_page) {
        var last_page_length = total - (page - 1) * perpage;
        rows = rows.splice(0, last_page_length);
      } else if (rows.length > perpage) {
        ndoc = rows.pop();
        // next page startkey
        if (ndoc) offset_docids[page - 1] = [ndoc.key, ndoc.id];
      }

      // return the last slice
      ret = parseRows(rows, total);
      return ret;
    }
  }
};
