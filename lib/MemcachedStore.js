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
  central.log('MemcachedStore initialized for servers: ' + options.hosts);

  self.client.on('issue', function(issue) {
    central.log('MemcachedStore::Issue @ ' + issue.server + ': ' +
    issue.messages + ', ' + issue.retries + ' attempts left');
  });

  var db = options.db;
  if (!db && options.dbname) {
    db = central.getDataBase(options.dbname);
  }

  // can store to database
  if (db) {
    var sync_time = (options.sync_time || 5) * 60000;
    self._changes = {};
    setTimeout(function() {
      self.sync();
    }, sync_time);
    self.sync_time = sync_time;
    self.db = db;
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
  var self = this;
  self.client.get(sid, function(err, data) {
    try {
      if (!data) {
        return self.db ? self.rawGet(sid, fn) : fn();
      }
      fn(null, JSON.parse(data.toString()));
    } catch (err) {
      fn(err);
    }
  });
};

MemcachedStore.prototype.rawGet = function(sid, fn) {
  var self = this;
  self.db && self.db.get(sid, function(err, res) {
    var expires, sess;
    try {
      sess = JSON.parse(res.val);
    } catch (e) {}

    if (!sess || !sess.cookie) return fn();

    expires = 'string' == typeof sess.cookie.expires
              ? new Date(sess.cookie.expires)
              : sess.cookie.expires;
    if (!expires || new Date < expires) {
      fn(null, sess);
    } else {
      self.destroy(sid, fn);
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
  var self = this;
  try {
    var maxAge = sess.cookie.maxAge;
    var ttl = 'number' == typeof maxAge ? maxAge / 1000 | 0 : oneDay;

    sess = JSON.stringify(sess);

    self.client.set(sid, sess, ttl, function() {
      fn && fn.apply(self, arguments);
    });

    // for automatical sync to database
    if (self._changes) {
      self._changes[sid] = sess;
    }

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
  if (this._changes) {
    this._changes[sid] = null;
  }
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
};

MemcachedStore.prototype.hasChanges = function() {
  return (this._changes && Object.keys(this._changes).length > 0);
};

MemcachedStore.prototype.sync = function(isExisting) {
  var self = this;
  if (self.hasChanges()) self.writeChanges();
  if (!isExisting) setTimeout(function() {
    self.sync();
  }, self.sync_time || 120000);
};

MemcachedStore.prototype.writeChanges = function(fn) {
  var self = this;
  var db = self.db;
  if (!db) return;
  setTimeout(function() {
    var changes = self._changes;
    var keys = Object.keys(changes);
    db.query({
      method: 'POST',
      path: '/_all_docs',
      body: { keys: keys }
    }, function(err, doc) {
      var revs = {};
      var item, sid, rev;
      for (var i in doc) {
        item = doc[i];
        sid = item && item.id;
        rev = item && item.value && item.value.rev;
        if (rev) revs[sid] = rev;
      }
      var arr = [];
      for (var sid in changes) {
        var obj = {
          _id: sid,
          val: changes[sid]
        };
        // delete this session
        if (obj.val === null) obj._deleted = true;
        if (revs[sid]) obj._rev = revs[sid];
        arr.push(obj);
      }
      db.save(arr, function(err, res) {
        self._changes = {};
      });
    });
  }, 0);
};
