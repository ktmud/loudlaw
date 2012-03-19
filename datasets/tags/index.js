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
  getOne: function(id, fn) {
    return this.fetch(['id', id], fn);
  },
  random: function(limit, next, tfor) {
    // needs to fetch many many tags first
    this.fetch(['list', 'for', tfor, 'default', 1, 500], function(err, data) {
      if (err) return next(err);
      next(null, data.list.shuffle(limit));
    });
  }
};

var exports = new Dataset({
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
});

central.lib._.extend(exports, more, require(cwd + '/datasets/_common/bulk'));

module.exports = exports;
