/*!
* connect-memcached
* Copyright(c) 2011 Michał Thoma <michal@balor.pl>
* MIT Licensed
*/

/**
* Library version.
*/

exports.version = '0.0.2';


/**
* Module dependencies.
*/

var Store = require('express').session.Store;
var Memcached = require('memcached');

// the file cache, should be a database backend
// but couchdb is surely not suitable for session storage.
// so we take the advantage of FileStore,
// use setTimeout to synchronize with fs periodly.
// And sessions data could be easily balanced
// in cluster workers, too.
//var cache = new FileStore({
  //fname: '__memcached_sessions__' + process.env.NODE_WORKER_ID,
  //sync_time: 60 // minutes
//});

/**
* One day in seconds.
*/

var oneDay = 86400;

/**
* Initialize MemcachedStore with the given `options`.
*
* @param {Object} options
* @api public
*/

var MemcachedStore = module.exports = function MemcachedStore(options) {
  var self = this;
  options = options || {};
  Store.call(self, options);
  if (!options.hosts) {
    options.hosts = '127.0.0.1:11211';
  }
  self.client = new Memcached(options.hosts, options);
  console.log('MemcachedStore initialized for servers: ' + options.hosts);

  self.client.on('issue', function(issue) {
    console.log('MemcachedStore::Issue @ ' + issue.server + ': ' +
    issue.messages + ', ' + issue.retries + ' attempts left');
  });
  if (options.sync_time) {
    var sync_time = options.sync_time * 60000;
    setTimeout(function() {
      self.sync();
    }, sync_time);
    self.sync_time = sync_time;
  }
  process.on('exit', function() {
    self.sync(true);
  });
};

/**
* Inherit from `Store`.
*/

MemcachedStore.prototype.__proto__ = Store.prototype;

/**
* Attempt to fetch session by the given `sid`.
*
* @param {String} sid
* @param {Function} fn
* @api public
*/

MemcachedStore.prototype.get = function(sid, fn) {
  this.client.get(sid, function(err, data) {
    try {
      if (!data) {
        return fn();
      }
      fn(null, JSON.parse(data.toString()));
    } catch (err) {
      fn(err);
    }
  });
};

/**
* Commit the given `sess` object associated with the given `sid`.
*
* @param {String} sid
* @param {Session} sess
* @param {Function} fn
* @api public
*/

MemcachedStore.prototype.set = function(sid, sess, fn) {
  try {
    var maxAge = sess.cookie.maxAge;
    var ttl = 'number' == typeof maxAge ? maxAge / 1000 | 0 : oneDay;
    var sess = JSON.stringify(sess);

    this.client.set(sid, sess, ttl, function() {
      fn && fn.apply(this, arguments);
      this._changed = true;
    });
  } catch (err) {
    fn && fn(err);
  }
};

/**
* Destroy the session associated with the given `sid`.
*
* @param {String} sid
* @api public
*/

MemcachedStore.prototype.destroy = function(sid, fn) {
  this.client.del(sid, fn);
  this._changed = true;
};

/**
* Fetch number of sessions.
*
* @param {Function} fn
* @api public
*/

MemcachedStore.prototype.length = function(fn) {
  this.client.items(fn);
};

/**
* Clear all sessions.
*
* @param {Function} fn
* @api public
*/

MemcachedStore.prototype.clear = function(fn) {
  this.client.flush(fn);
  this._changed = true;
};

MemcachedStore.prototype.all = function(fn) {
  var memcached = this.client;
  memcached.items(function(err, result) {
    if (err) console.error(err);

    // for each server...
    result.forEach(function(itemSet) {
      var keys = Object.keys(itemSet);
      keys.pop(); // we don't need the "server" key, but the other indicate the slab id's

      keys.forEach(function(stats) {
        // get a cachedump for each slabid and slab.number
        memcached.cachedump(itemSet.server, stats, itemSet[stats].number, function(err, response ) {
          // dump the shizzle
          console.info(JSON.stringify(response));
          console.log(response.key);
        });
      });
    });
  });
};

MemcachedStore.prototype.sync = function(isLast) {
  var self = this;
  if (self._changed) self.toFile();
  if (!isLast) setTimeout(function() {
    self.sync();
  }, self.sync_time || 120000);
};

MemcachedStore.prototype.toFile = function(fn) {
  var self = this;
  setTimeout(function() {
    var dataset = global.central.datasets.sessions;
  }, 0);
};

MemcachedStore.prototype.loadAll = function() {
  var self = this;
  process.nextTick(function() {
    this.client.get(self.fname, function(err, res) {
      if (typeof res != 'object') return;
      self.sessions = res;
    });
  });
};
