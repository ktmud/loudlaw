var colors = require('colors');
var events = require('events');
var u_s = require('underscore');
var fs = require('fs');
var passport = require('passport');
var express = require('express');
var jade = require('jade');
var istatic = require('istatic');

// we just had a global event handler.
var central = global.central = module.exports = new events.EventEmitter();
var cwd = central.cwd = process.cwd();
var Cache = require(cwd + '/lib/Cache.js');

jade.doctypes.default = '<!DOCTYPE html>';

var conf = require(cwd + '/conf/configuration.js');
central.conf = conf;
central.DEBUG = conf.debug;
central.cache = new Cache(conf.cache);

central.lib = {
  express: express,
  istatic: istatic,
  uglify: istatic.uglify,
  jade: jade,
  passport: passport,
  '_': u_s,
  Pager: require(cwd + '/utils/Pager')
};

var helpers = central.helpers = central.utils = require('./utils.js');
central.log = helpers.applog;
central.istatic = helpers.istatic;

central.exception_msgs = require(cwd + '/conf/exception_msgs.js');

// read those libs as string,
// they are not imported as nodejs module by default
central.lazylib = {};

// modules holders.
central.modules = {};

// for vhost support
central.servers = [];

// comunicate with database
central.datasets = {};

var rootDomain = conf.site_root.split('://').slice(-1).join('').split(':')[0] || 'localhost';
rootDomain = rootDomain.split('.').slice(1).join('.') || rootDomain;

central.rootDomain = rootDomain;

// database connection
central.dbconn = conf.dbconn;

function strfy(obj) {
  return JSON.stringify(obj, function(k, item) {
    if (typeof item == 'function') return item.toString();
    return item;
  });
}

central.getDataBase = function(dbname, design) {
  var db = central.dbconn.db(central.conf.db_prefix + dbname);

  process.nextTick(function() {
    db && db.exists(function(err, exists) {
      if (err) {
        central.log('error', '[db ' + dbname.red + '] connection ' + err);
        return;
      }
      if (exists) {
        central.log('info', '[db]: '.green + dbname + ' is ready to serve');
      } else {
        db.create();
        central.log('info', '[db]: '.yellow + dbname + ' creating..');
      }

      if (!design) return;

      u_s.each(design, function(doc, d) {
        var id = '_design/' + d;
        var doc_str = strfy(doc);
        db.get(id, function(err, res) {
          if (err) {
            central.emit('silent-err', err);
          }
          var rev;
          if (res) {
            rev = res._rev;
            delete res._rev;
            delete res._id;
            if (strfy(res) == doc_str) return;
          }
          db.save(id, rev, doc, function(err, ret) {
            if (ret && ret.ok) {
              central.log('info', '[db]: '.green + dbname + ' design doc updated');
            } else {
              cental.log('error', err);
            }
          });
        });
      });
    });
  });

  return db;
};

if (conf.sessionStore.memcached) {
  var MemcachedStore = require(cwd + '/lib/MemcachedStore.js');
  var sessionStore = central.sessionStore = new MemcachedStore(conf.sessionStore);
} else {
  var FileStore = require(cwd + '/lib/FileStore.js');
  var sessionStore = central.sessionStore = new FileStore(conf.sessionStore);
}

var tmp = fs.readdirSync(cwd + '/datasets/');
tmp.forEach(function(item) {
  if (item[0] == '_') return;
  central.datasets[item.replace('.js', '')] = require(cwd + '/datasets/' + item);
});


// module initializer
function Mo(mo, app) {
  mo.__proto__ = Mo.prototype;
  if (mo.init) mo.init(central, app);
  return mo;
}
// enable submodule, the last argument must be
// an app, because this submodule can be enabled in
// different ways, and it may even be a function outside
// this module's directory.
// Anyway, we just need the module's context.
Mo.prototype.mount = function() {
  var self = this;
  var args = Array.prototype.slice.call(arguments);
  var app = args.pop();
  for (var i = 0, len = args.length; i < len; i++) {
    var submod = args[i];
    var mod_name;
    if (typeof submod == 'string') {
      mod_name = submod;
      var dir = self._dir + '/' + submod;
      submod = require(dir);
      app.log('info', 'load..', dir);
    } else {
      mod_name = submod._name;
    }
    if (typeof submod == 'funtion') {
      submod.call(self, central, app, self.dataset);
    }
    if (submod.init) {
      submod = new Mo(submod, app);
    }
    if (mod_name) self[mod_name] = submod;
  }
  return self;
};
central.modules.__proto__ = Mo.prototype;

central.addModule = function(name, app) {
  app = app || this;
  var dir = cwd + '/modules/' + name;
  var mo = require(dir);
  app.log('info', 'load..', dir);
  var modules = app.modules || (app.modules = {});
  app.modules[name] = Mo(mo, app);
  return app;
};
central.extendModule = function() {
  var self = this;
  var args = Array.prototype.slice.call(arguments);
  var mod = args.pop();
  var prefix = self._dir ? (self._dir + '/mod_') : (mod._dir + '/');
  for (var i = 0, len = args.length; i < len; i++) {
    var name = args[i];
    var dir = prefix + name;
    self.log('info', 'load..', dir);
    var mo = require(dir);
    mo.call(mod, central, self, mod.dataset);
  }
};

central.on('silent-error', function(msg, app) {
  app = app || central;
  app.log('error', msg);
  console.trace();
});

// custom request functions
central.reqbase = require(cwd + '/lib/reqbase');
