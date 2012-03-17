var cwd = central.cwd;
var Dataset = require(cwd + '/lib/Dataset.js');
var util = require('util');

var gets = {
  id: function(keyinfo, next) {
    var self = this;
    var _id = keyinfo[0]; // _id is the slug
    self.db.get(_id, function(err, user) {
      if (err) {
        if (err.error === 'not_found') return next(404);
        return next(err.error, null);
      }
      return next(null, user);
    });
  }
};

// get list function
central.lib._.extend(gets, require(cwd + '/datasets/_common/get_list'));

var puts = {
  id: function(keyinfo, doc, next) {
    var self = this;
    var _id = keyinfo[0]; // _id is the slug
    var _rev = doc._rev;

    delete doc._id;
    delete doc._rev;

    self.db._save(_id, _rev, doc, function(err, res) {
      if (err) return next(err);
      if (!err && res && res.ok) {
        doc._id = res.id;
        doc._rev = res.rev;
      }
      next(err, doc);
    });
  }
};

var more = {
  get: function(id, fn) {
    return this.fetch(['id', id], fn);
  },
  // get many tags
  bulk: function(opt, next) {
    var ids;
    var self = this;
    if (opt instanceof Array) {
      ids = opt.slice();
    } else if (typeof opt === 'string') {
      ids = opt.ssplit();
    }
    if (ids) return self.details(ids, next);

    // random pick
    if (opt.random) return self.random(opt.limit, next, opt.for);

    self.db.query('POST', '/_all_docs', {
      include_docs: true
    }, opt, function(err, data) {
      if (err) return next(err);
      for (var i in data) {
        var item = data[i];
        var doc = item.doc;
        if (doc) {
          tags[tags.indexOf(item.id)] = doc;
          // save to cache
          self.stash(['id', item.id], doc);
        }
      }
      next(null, tags);
    });
  },
  random: function(limit, next, tfor) {
    // needs to fetch many many tags first
    this.fetch(['list', 'for', tfor, 'default', 1, 500], function(err, data) {
      if (err) return next(err);

      next(null, data.list.shuffle(limit));
    });
  },
  // get tag details
  details: function(tags, next) {
    var self = this;
    if (!tags.length) return next(404);

    var ret = [];
    var keys = [];

    for (var i in tags) {
      var tag = tags[i];
      // try to get it from cache
      var cached = self.get(['id', tag]);
      if (cached) {
        tags[i] = cached;
      } else {
        keys.push(tag);
      }
    }

    if (keys.length) {
      self.db.get(keys, function(err, data) {
        if (err) return next(err);
        for (var i in data) {
          var item = data[i];
          var doc = item.doc;
          if (doc) {
            tags[tags.indexOf(item.id)] = doc;
            // save to cache
            self.stash(['id', item.id], doc);
          }
        }
        next(null, tags);
      });
    } else {
      next(null, tags);
    }
  }
};

module.exports = central.lib._.extend(new Dataset({
  cache_options: {
    id: {
      memLife: 30, // minutes
      fileLife: 5, // days
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
  // how to fetch the original data
  gets: gets,
  puts: puts,
  _design: require('./_design'),
  dbname: 'tags'
}), more);
