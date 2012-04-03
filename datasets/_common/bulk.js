var _ = central.lib._;

module.exports = {
  // get details and maitain the order
  details: function(ids, next) {
    var self = this;
    if (ids instanceof Array) {
      ids = ids.slice();
    } else if (typeof ids === 'string') {
      ids = ids.ssplit();
    }
    if (!ids.length) return next(404);
    self.bulkGet(ids, function(err, data) {
      data && ids.forEach(function(item, i) {
        ids[i] = data[item] || ids[i];
      });
      next(err, ids);
    });
  },
  // bulk get
  bulkGet: function(ids, fn) {
    var self = this;
    var ret = {};
    var real_ids = [];

    ids.forEach(function(item, i) {
        var doc = self.get(item);
      if (doc) {
        ret[item] = doc;
      } else {
        real_ids.push(item);
      }
    });

    if (!real_ids.length) return fn(null, ret);

    self.db.get(real_ids, function(err, doc) {
      if (err) central.log('error', err);
      var item, id, rev;
      for (var i in doc) {
        item = doc[i] && doc[i].doc;
        id = item && item._id;
        if (id) {
          ret[id] = item;
          self.stash(['id', id], item);
        }
      }
      fn(err, ret);
    });
  },
  // bulk update
  bulkUpdate: function(data, fn) {
    // default to merge
    var is_merge = 'is_merge' in data ? data.is_merge : true;
    var self = this;

    // ids need to pull from database first
    var ids = [];
    var idx = {};

    data.forEach(function(item, i) {
      var doc;
      var id = item._id;
      if (id) {
        ids.push(id);
        idx[id] = i;
      }
    });

    function doSave() {
      self.db.save(data, function(err, res) {
        if (err) central.log(err);
        fn(err, res);
      });
    }

    if (!ids.length) return doSave();

    self.bulkGet(ids, function(err, res) {
      var id, item, i;
      if (is_merge) {
        for (id in res) {
          item = res[id];
          i = idx[id];
          // update exsiting doc
          if (item) {
            data[i] = _.extend(item, data[i]);
          }
        }
      } else {
        var rev;
        for (id in res) {
          item = res[id];
          i = idx[id];
          // try get the revision
          rev = item && item._rev;
          rev && i && data[i] && (data[i]._rev = rev);
        }
      }
      doSave();
    });
  }
};
