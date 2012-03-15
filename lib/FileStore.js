var Store = require('express').session.Store;
var Cache = require('./Cache.js');

var cache = new Cache({
  dir: process.cwd() + '/var/stable_cache/',
  memLife: 0, // we just need it to write file
  fileLife: 0, // and session never expires, ttl is inside session detail itself
  tofile: true,
  keysplitter: '_|_'
});

global.file_caches_counter = 0;

// single file cache
function FileStore(opt) {
  var self = this;
  self.sessions = {};
  self.sync_time = (opt.sync_time || 5) * 60000;  // 5 minutes
  self.fname = opt.fname || '__all__' + global.file_caches_counter;
  process.on('exit', function() {
    self.sync();
  });
  self.sync();
  // read all the data
  self.loadAll();
  global.file_caches_counter++;
  return self;
}

FileStore.prototype.__proto__ = Store.prototype;

FileStore.prototype.get = function(sid, fn) {
  var self = this;
  process.nextTick(function() {
    var expires, sess = self.sessions[sid];
    if (sess) {
      sess = JSON.parse(sess);
      expires = 'string' == typeof sess.cookie.expires
                ? new Date(sess.cookie.expires)
                : sess.cookie.expires;
      if (!expires || new Date < expires) {
        fn(null, sess);
      } else {
        self.destroy(sid, fn);
      }
    } else {
      fn();
    }
  });
};

FileStore.prototype.set = function(sid, sess, fn) {
  var self = this;
  var self = this;
  process.nextTick(function() {
    self.sessions[sid] = JSON.stringify(sess);
    self._changed = true;
    fn && fn();
  });
};

FileStore.prototype.destroy = function(sid, fn) {
  var self = this;
  process.nextTick(function() {
    delete self.sessions[sid];
    self._changed = true;
    fn && fn();
  });
};

FileStore.prototype.all = function(fn) {
  var arr = [], keys = Object.keys(this.sessions);
  for (var key in sessions) {
    arr.push(sessions[key]);
  }
  fn(null, arr);
};

FileStore.prototype.clear = function(fn) {
  this.sessions = {};
  this._changed = true;
  fn && fn();
};

FileStore.prototype.length = function(fn) {
  fn(null, Object.keys(this.sessions).length);
};

FileStore.prototype.loadAll = function() {
  var self = this;
  process.nextTick(function() {
    cache.read(self.fname, function(res) {
      if (typeof res != 'object') return;
      self.sessions = res;
    });
  });
};
FileStore.prototype.sync = function() {
  var self = this;
  if (self._changed && Object.keys(self.sessions).length) {
    self.toFile();
  }
  setTimeout(function() {
    self.sync();
  }, self.sync_time);
};
FileStore.prototype.toFile = function(fn) {
  var self = this;
  setTimeout(function() {
    var fname = self.fname;
    cache.save(fname, self.sessions);
  }, 0);
};

module.exports = FileStore;
