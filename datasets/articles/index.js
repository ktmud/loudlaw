var cwd = central.cwd;
var Dataset = require(cwd + '/lib/Dataset');
var Article = require(cwd + '/models/article');
var util = require('util');

var gets = {
  search: function(keyinfo, next) {
    var self = this;
    var field = keyinfo[0];
    var keyword = keyinfo[1];
    var sort = keyinfo[2] || '';
    var page = keyinfo[3] || 1;
    var perpage = keyinfo[4] || 10;
    keyword = keyword.replace(/(“|”)/g, '"');
    var fil = {
      stale: 'ok',
      q: keyword,
      limit: perpage
    };
    if (sort) {
      // make descending the default
      var tmp = sort.split('_');
      var descending = (tmp.length < 2 || (tmp[1] && tmp[1] != 'asc')) ? true : false;
      fil.sort = (descending ? '\\' : '/') + tmp[0];
    }

    if (page > 1) fil.skip = perpage * (page - 1);

    self.lucene('article/' + field, fil, function(err, doc) {
      if (!err && doc && doc.total_rows) {
        var ret = {
          keyword: keyword.indexOf('"') > -1 ? keyword.replace(/"/g, ' ').trim() : doc.q.replace(/default:/g, ''),
          total: doc.total_rows,
          list: doc.rows
        };
        return next(null, ret);
      } else {
        return next(err, ret);
      }
    });
  },
  sid: function(keyinfo, next) {
    var self = this;
    var sid = keyinfo[0];
    self.db.view('article/sid', { key: sid }, function(err, ret) {
      if (err) {
        console.log('[err]'.red + ' find article ', err);
        err = err.error || err;
        // if we don't want to save it, we don't pass a null to next
        return next(err);
      }

      if (!ret || !ret.length) {
        next(404);
      } else {
        next(err, ret[0].value);
      }
    });
  },
  all_docs: function(keyinfo, next) {
    var self = this;
    var fil = { include_docs: true };
    var sort = keyinfo[0];
    var page = keyinfo[1];
    var perpage = keyinfo[2];

    fil.limit = perpage;
    fil.skip = perpage * (page - 1);
    if (!fil.skip || fil.skip < 0) delete fil.offset;

    if (sort === 'desc') fil.descending = true;

    self.db.get('_all_docs', fil, function(err, data) {
      var ret;
      if (data) {
        var list = data.rows;
        list.forEach(function(item, i) {
          var doc = item.doc;
          var sid = doc._sid || doc.slug || (doc.title && doc.title.trim()) || doc._id;
          doc.sid = sid;
          self.stash(['sid', sid], doc);
          list[i] = doc;
        });
        ret = {
          total: data.total_rows,
          list: list
        };
      }
      next(err, ret);
    });
  }
};

central.lib._.extend(gets, require(cwd + '/datasets/_common/get_list'));

var puts = {
  sid: function(key, doc, next) {
    var self = this;
    var sid = key[0];
    var _id = doc._id;
    var _rev = doc._rev;

    delete doc._id;
    delete doc._rev;

    self.db._save(_id, _rev, doc, function(err, res) {
      if (err) {
        console.log('[err]'.red + ' save doc ' + doc.title.red, err);
      }

      if (err && err.error) {
        err = 'article ' + err.error;
      }

      if (!err && res && res.ok) {
        doc._id = res.id;
        doc._rev = res.rev;
      }
      next && next(err, doc);
    });
  }
};

module.exports = new Dataset({
  cache_options: {
    search_all: {
      memLife: 10 // minutes
    },
    search_title: {
      memLife: 0 // minutes
    },
    sid: {
      memLife: 30, // minutes
      fileLife: 5, // days
      model: Article,
      tofile: true
    },
    list_count: {
      memLife: 30, // minutes
      fileLife: 10, // days
      tofile: true
    },
    list: {
      memLife: 30, // minutes
      fileLife: 10, // days
      tofile: true
    }
  },
  dbname: 'articles',
  _design: require('./_design'),
  // how to fetch the original data
  puts: puts,
  gets: gets
});
