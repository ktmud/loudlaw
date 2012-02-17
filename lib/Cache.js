var path = require('path');
var fs = require('fs');
var u_s = require('underscore');
var utils = require('./utils.js');
var mkdirp = require('mkdirp');

var log = utils.log;

var deleteFile = fs.unlink;
var reg_badchar = /[\?\s\[\]\=\+\:\"\'\,\*\%\^\$\!\`\;]/g;

/**
* cache data.
* @constructor
*/
var Cache = function(opts) {
  var opts = opts || {};

  u_s.defaults(opts, {
    memLife: 10, // how many minutes will cache resists in memory
    fileLife: 5, // how many days will cache resists in file system
    dir: process.cwd() + '/var/cache/',
    // how many keys should we keep in memory
    threshhold: 200
  });

  var self = this;

  if (fs && path) {
    var dir = opts.dir;
    path.exists(dir, function(exists) {
      if (exists) {
        log('[cache]: '.green + 'existing cache dir: ' + dir);
        self.fileroot = dir;
      } else {
        mkdirp(dir, 0775, function() {
          log('[cache]: '.yellow + 'making cache dir: ' + dir.green);
          self.fileroot = dir;
        });
      }
    });
  }

  u_s.extend(self, opts);

  // memory caches
  self.data = {};
  // timer for cache
  self.timer = {};

  return self;
};

String.prototype.fname = function() {
  return this.slice(this.lastIndexOf('/') + 1);
};
String.prototype.dirname = function() {
  return this.slice(0, this.lastIndexOf('/') + 1);
};


Cache.prototype = {
  // save cache to memory
  // if memlife is 0, cache will be preserved in memory forever,
  // unless opt.tofile is true. In this situation, cache is written
  // to file, and memory cache will be removed.
  save: function(key, value, opt, next) {
    var self = this;
    var opt = opt || {};
    var etag = opt.etag;
    var life = opt.memLife || self.memLife;
    var tofile = opt.tofile || self.tofile;
    var keephits = opt.keephits;

    // by default, cache will only survive
    // in the memory for 5 minutes.

    // if life is a given date
    if (life instanceof Date) {
      life = life - new Date();
    }

    // convert to milliseconds
    life = life * 60000;

    var keysCount = Object.keys(self.data).length;

    // keep the cache get hits more than ... times, in memory.
    // the more cache data web have, the more hits is requred to keep it
    keephits = keephits || keysCount * 10;

    // when reaching the limit
    // automatically delete
    if (keysCount > self.threshold) {
      // index of the one to be deleted
      var delIndex = 0;
      var delkey;
      var deldata;
      while (delIndex < keysCount) {
        deldata = delkey && self.data[delkey];
        // find data should be deleted
        if (deldata.hit < deldata.keephits) {
          self.resetTimer(delkey);
          break;
        }
        delIndex++;
      }
      delkey && self.delete(delkey, true);
    }

    self.data[key] = {
      value: value,
      etag: etag,
      birth: new Date(),
      life: life,
      khits: keephits,
      hit: 0
    };

    if (tofile) {
      self.toFile(key, opt, function() {
        next && next(value);
        // even delete here, the data may still be in memory
        // we just wait for v8 to do garbage collection
        // but it's also important to do this here, otherwise
        // it will not be collected at all.
        if (!life) delete self.data[key];
      });
      return;
    }
    next && next(value);
    if (life > 2000) {
      self.resetTimer(key, true);
    } else {
      delete self.data[key];
    }
    return this;
  },
  append: function(key, value) {
    var self = this;
    var d = self.data[key];
    if (d) {
      self.resetTimer(key, true);
      d.value += value;
    }
    return self;
  },
  resetTimer: function(key, do_restart) {
    var self = this;
    process.nextTick(function() {
      try {
        clearTimeout(self.timer[key]);
      } catch (e) {}
      if (do_restart) {
        if (!self.data[key]) return;
        if (!self.data[key].life) return;
        self.timer[key] = setTimeout(function() {
          self.tryClear(key);
        }, self.data[key].life);
      }
    });
    return self;
  },
  // try to clear some cache after its life.
  // but if the cache is hot enough for keeping,
  // keep the data, just count down a little bit.
  tryClear: function(key) {
    var self = this;
    process.nextTick(function() {
      var data = self.data[key];
      if (!data) return self;

      var life = data.life;
      if (!life) return self;
      if (data.hit < data.khits) {
        log('[delete]: '.yellow + key  + ' due to timeout of ' + life / 1000 + ' seconds');
        return self.delete(key, true);
      }
      data.hit--;
      self.timer[key] = setTimeout(function() {
        self.tryClear(key);
      }, life);
    });
    return self;
  },
  // save existing memory cache to file
  toFile: function(key, opt, next) {
    var self = this;
    process.nextTick(function() {
      if (typeof opt == 'function') {
        next = opt;
        opt = {};
      } else {
        opt = opt || {};
      }

      var encoding = ('encoding' in opt) ? opt.encoding : 'utf-8';
      if (!self.fileroot) return;

      var data = self.data[key];
      var val = data && data.value;

      if (!val) return next && next();

      if (encoding) {
        val = JSON.stringify(val);
        if (!val) {
          central.emit('silent-error',
          'can\'t save cache file. data format not supported');
          return;
        }
      }

      var filename = self.getFilename(key);
      var filepath = self.fileroot + filename;
      var filedir = self.fileroot + filename.dirname();

      path.exists(filedir, function(err, exists) {
        if (!err && exists) return writeFile();
        mkdirp(filedir, function(err) {
          if (!err) writeFile();
        });
      });

      function writeFile() {
        var write_args = [filepath, val];
        if (encoding) write_args.push(encoding);
        write_args.push(function(err) {
          var msg = ('[save]: ')[err ? 'red' : 'green'] + key + ' to '.yellow + filepath;
          if (err) {
            console.log(err);
            central.emit('silent-error', msg + ' failed');
          } else {
            log(msg + ' succeeded');
          }
          next && next(err, val);
        });
        fs.writeFile.apply(fs, write_args);
      }
    });
  },
  getFilename: function(key) {
    key = key.replace(reg_badchar, '_');
    var paths = key.split('/');
    var fname = paths.pop() || 'index';
    if (fname.length > 32) fname = central.helpers.md5(key);
    paths.push(fname);
    key = paths.join('/');
    return key;
  },
  exists: function(key) {
    return (typeof this.data[key] !== 'undefined');
  },
  // get data from memory
  // this is an synchronous function
  get: function(key) {
    if (!this.exists(key)) return;

    var data = this.data[key];

    // count the hits of this cache,
    // in order to not wipe out hot data.
    data.hit++;

    return data.value;
  },
  getInfo: function(key) {
    return this.data[key];
  },
  // try get data from memory first,
  // then read cache from a file asyncly.
  // no error will return
  // errors are just silently ignored
  read: function(key, opt, next) {
    var self = this;
    if (typeof opt == 'function') {
      next = opt;
      opt = {};
    } else {
      opt = opt || {};
    }

    var life = opt.fileLife || self.fileLife;
    // the life is count in 'day'
    var age_limit = (Date.now() - life * 86400000);
    var getRes = !opt.raw && self.exists(key);

    // when we can directly get this data
    if (getRes) {
      var data = self.data[key];
      // check for expiration
      if (data.birth < age_limit) {
        self.delete(key);
        return next();
      }
      data.hit++;
      return next(data.value, data.etag);
    }
    // if we can't read file
    if (!self.fileroot) {
      next();
      return;
    }

    var filename = self.getFilename(key);
    var filepath = self.fileroot + filename;

    path.exists(filepath, function(exists) {
      // if file doesn't exist, return with no data.
      if (!exists) {
        next();
        return;
      }

      var encoding = ('encoding' in opt) ? opt.encoding : 'utf-8';

      var stat = fs.statSync(filepath);
      // file modify time
      var mtime = stat.mtime;
      var etag = opt.etag && utils.md5([stat.ino, stat.size, mtime.getTime()].join(''));

      // there is a filelife limit and file expried
      if (life && age_limit > mtime) {
          next();
          deleteFile(filepath);
          log('[delete]: '.blue + key + ' due to expiration.');
          return;
      }

      fs.readFile(filepath, function(err, data) {
        if (!err) {
          if (encoding) {
            data = data.toString(encoding);
            try {
              data = JSON.parse(data);
            } catch (e) {}
          }
          // if no encoding appointed,
          // the data is read and saved as Buffer
          self.save(key, data, opt);
        }
        log('[read]: '.green + key + ' from '.yellow + filepath);
        // silently ignore the error.
        next(data, etag, mtime);
      });
    });
    return self;
  },
  bulk_delete: function(key, keepFile, fn) {
    var self = this;
    var keys = Object.keys(this.data);
    if (key instanceof Function) {
      filfn = key;
    } else {
      filfn = function(item, i) {
        return item.indexOf(key) > -1;
      }
    }

    keys = keys.filter(filfn);

    var count = keys.length;

    for (var i in keys) {
      this.delete(keys[i], keepFile, function() {
        count--;
      });
    }

    if (fn) {
      var t = setInterval(function() {
        if (!count) {
          fn();
          clearInterval(t);
        }
      }, 50);
    }
  },
  clear: function(keepFile, fn) {
    var self = this;
    process.nextTick(function() {
      self.bulk_delete(function() { return true; }, keepFile, fn);
    });
  },
  // delete the memory cache and file cache.
  delete: function(key, keepFile, fn) {
    var self = this;

    if (self.data[key]) {
      self.resetTimer(key);
      delete self.data[key];
      log('[delete]: ' + key);
    }

    // whether to delete cache file too
    if (!keepFile && self.fileroot) {
      process.nextTick(function() {
        var filename = self.getFilename(key);
        var filepath = self.fileroot + filename;
        path.exists(filepath, function(exists) {
          if (exists) {
            deleteFile(filepath, fn);
            log('[delete]: ' + filepath + ' of ' + key);
          }
        });
      });
    } else {
      fn && fn();
    }

    return self;
  }
};

module.exports = Cache;
