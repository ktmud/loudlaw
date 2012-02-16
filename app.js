var express = require('express');
var colors = require('colors');
var jade = require('jade');
var passport = require('passport');
var Cache = require(__dirname + '/lib/Cache.js');
var FileStore = require(__dirname + '/lib/FileStore.js');
var fs = require('fs');

jade.doctypes.default = '<!DOCTYPE html>';

var central = require(__dirname + '/lib/central.js');
// register global
global.central = central;

var conf = require(__dirname + '/conf/configuration.js');

var rootDomain = conf.site_root.split('://').slice(-1).join('').split(':')[0] || 'localhost';
rootDomain = rootDomain.split('.').slice(1).join('.') || rootDomain;

central.rootDomain = rootDomain;
central.conf = conf;
// database connection
central.dbconn = conf.dbconn;
central.cache = new Cache(conf.cache);
var sessionStore = central.sessionStore = new FileStore(conf.sessionStore);
central.passport = passport;

// load datasets
var tmp = fs.readdirSync(__dirname + '/datasets/');
tmp.forEach(function(item) {
  if (item[0] == '_') return;
  central.datasets[item.replace('.js', '')] = require(__dirname + '/datasets/' + item);
});

// boot application
function bootApp(app, mdls, next) {
  if (typeof mdls == 'function') {
    next = mdls;
    mdls = null;
  }

  app.set('environment', conf.NODE_ENV);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.log = central.utils.applog;
  app.addModule = central.addModule;
  app.extendModule = central.extendModule;
  app.modules = {};
  app.mount = central.modules.__proto__.mount;

  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({
    secret: central.conf.salt,
    store: sessionStore
  }));
  app.use(express.csrf());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(express.static(__dirname + '/public', conf.static_conf));
  app.use(express.staticCache());

  // reference to the app running
  central.app = app;

  if (mdls) mdls.forEach(function(name) { app.addModule(name); });

  next && next(app);
}

var vhosts = [];
// boot specific server
function bootServer(hostname, port, app, cb) {
  var _dir = __dirname + '/servers/' + hostname;
  var serverConf = require(_dir);
  var server = central.servers[hostname] ||
  (central.servers[hostname] = express.createServer());
  var cb;
  var routes;
  try {
    routes = require(__dirname + '/servers/' + hostname + '/routes');
  } catch (e) {}

  server._dir = _dir;
  server.hostname = hostname;
  server.host = hostname + '.' + rootDomain + ':' + (port || conf.port);
  server.port = port;

  // do something before boot
  if ('initSets' in conf) {
    conf.initSets(server, express);
  }

  // give this server a dedicated port
  if (port && !cb) {
    cb = function(server) {
      server.listen(port);
      server.log('info', 'listen'.yellow + ':' + ('' + port).yellow);
    };
  }

  bootApp(server, serverConf.modules, cb);

  serverConf.before && serverConf.before(server, app);
  server.after = serverConf.after;

  // init routes...
  if (routes) {
    server.log('info', 'Routing..');
    routes(central, server, app);
  }

  if ('afterBoot' in conf) {
    conf.afterBoot(server, express);
  }

  var vhost = serverConf.vhost;
  if (vhost) {
    hostname = (typeof vhost == 'string' && vhost) ? vhost : hostname;
    vhosts.push([hostname, server]);
  }

  return server;
}

// initial bootstraping
exports.boot = function() {
  var app = central.servers['www'] = express.createServer();

  var servers = conf.servers;
  var hosts = {};
  if (servers && servers.length) {
    servers.forEach(function(arg) {
      var port;
      var hostname = arg;
      var isProxied;
      if (arg instanceof Array) {
        hostname = arg[0];
        port = arg[1];
        isProxied = arg[2];
      }
      bootServer(hostname, port, app);
      hosts[hostname.toUpperCase() + '_ROOT'] = 'http://' + hostname + '.' + rootDomain + (isProxied ? '' : ':' + port);
    });
  }

  vhosts.forEach(function(host) {
    var hostname = host[0];
    var server = host[1];
    app.use(express.vhost(hostname + '.' + rootDomain, server));
  });

  bootServer('www', conf.port);

  // server boot callbacks
  for (var hostname in central.servers) {
    var server = central.servers[hostname];
    var fn = server.after;
    // add helpers for server hosts
    server.helpers(hosts);
    fn && fn(server, app);
  }
};

if (!module.parent) {
//setTimeout(function() {
  exports.boot();
//}, 20000);
}
