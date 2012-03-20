if (!module.parent) process.on('uncaughtException', function(err, next) {
  var msg;
  if (err instanceof Error) {
    msg = '[err]: ' + err + '\n' + err.stack;
  } else {
    msg = (err.name || err.reason || err.message);
    console.error(err);
  }
  console.error(msg);
  next();
});


var fs = require('fs');
var central = require(__dirname + '/lib/central.js');
var conf = central.conf;

var express = central.lib.express;
var istatic = central.lib.istatic;
var autostatic = central.lib.autostatic;

// boot application
function bootApp(app, next) {
  var passport = central.lib.passport;

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
    cookie: { domain: '.' + central.rootDomain },
    store: central.sessionStore
  }));
  app.use(express.csrf());
  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/assets', express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use('/assets', autostatic(__dirname + '/public', conf.static_conf));

  // reference to the app running
  central.app = app;

  central.reqbase.addHelpers(app);

  next && next(app);
}

var vhosts = [];
// boot specific server
function bootServer(hostname, port, app, cb) {
  var conf = central.conf;
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
  server.host = hostname + '.' + central.rootDomain + ':' + (port || conf.port);
  server.port = port;

  // do something before boot
  if ('initSets' in conf) {
    conf.initSets(server, express);
  }

  // give this server a dedicated port
  if (port && !cb) {
    cb = function(server) {
      server.listen(port, '127.0.0.1');
      server.log('info', 'listen'.yellow + ':' + ('' + port).yellow);
    };
  }

  bootApp(server, cb);

  serverConf.before && serverConf.before(server, app);

  var mdls = serverConf.modules;
  if (mdls) mdls.forEach(function(name) { server.addModule(name); });

  serverConf.after && serverConf.after(server, app);

  server.ending = serverConf.ending;

  // init routes...
  if (routes) {
    server.log('info', 'Routing..');
    routes(central, server, app);
  }

  if ('afterBoot' in conf) {
    conf.afterBoot(server, express);
  }

  var vhost = serverConf.vhost;
  if (vhost || !port) {
    hostname = (typeof vhost == 'string' && vhost) ? vhost : hostname;
    vhosts.push([hostname, server]);
  }

  istatic.enable(server, { root: __dirname + '/public' });

  return server;
}

// initial bootstraping
exports.boot = function() {
  var app = central.servers['www'] = express.createServer();
  var rootDomain = central.rootDomain;
  var conf = central.conf;

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
      var port_suffix = conf.isProxied ? '' : (':' + (port || conf.port));
      hosts[hostname.toUpperCase() + '_ROOT'] = 'http://' + hostname + '.' + rootDomain + port_suffix;
    });
  }

  vhosts.forEach(function(host) {
    var hostname = host[0];
    var server = host[1];
    server.log('info', 'vhosting..');
    app.use(express.vhost(hostname + '.' + rootDomain, server));
  });

  // server boot callbacks
  for (var hostname in central.servers) {
    var server = central.servers[hostname];
    // add helpers for server hosts
    server.helpers(hosts);
    server.ending && server.ending(server, app);
    // for garbage collection..
    delete server.ending;
  }

  bootServer('www', conf.port);
};

if (!module.parent) {
//setTimeout(function() {
  exports.boot();
//}, 20000);
}
