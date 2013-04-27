//if (!module.parent) process.on('uncaughtException', function(err, next) {
  //var msg;
  //if (err instanceof Error) {
    //msg = '[err]: ' + err + '\n' + err.stack;
  //} else {
    //msg = (err.name || err.reason || err.message);
    //console.error(err);
  //}
  //console.error(msg);
  //next && next();
//});

var fs = require('fs');
var central = require(__dirname + '/lib/central.js');
var conf = central.conf;

var express = central.lib.express;
var autostatic = central.autostatic;

var vhosts = [];
// boot specific server
function bootServer(hostname, port, app, cb) {
  var conf = central.conf;
  var _dir = __dirname + '/servers/' + hostname;
  var serverConf = require(_dir);
  var server = express();
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
      server.log('info', 'listen '.yellow + 'http://127.0.0.1:' + ('' + port).yellow);
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

  return server;
}

// boot application
function bootApp(app, next) {
  var passport = central.lib.passport;

  app.set('environment', conf.NODE_ENV);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.enable('trust proxy')
  app.log = central.utils.applog;
  app.addModule = central.addModule;
  app.extendModule = central.extendModule;
  app.modules = {};
  app.mount = central.modules.__proto__.mount;

  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.cookieSession({
    secret: central.conf.salt,
    cookie: { domain: '.' + central.rootDomain },
    store: central.sessionStore
  }));
  app.use(express.bodyParser());
  app.use(express.csrf());

  app.use(passport.initialize());
  app.use(passport.session());

  central.reqbase.addHelpers(app);

  app.use(app.router);

  if (app.hostname === 'www') {
    app.engine('less', function(path, options, fn) {
      console.log(arguments);
      fs.readFile(path, 'utf8', function(err, str) {
        if (err) return fn(err);

        new(less.Parser)({
          paths: [require('path').dirname(path)],
          optimization: 0
        }).parse(str, function(err, tree) {
          if (err) return fn(err);
          try {
            css = tree.toCSS();
            fn(null, css);
          } catch (e) {
            fn(e);
          }
        });
      });
    });
    app.use('/css/', central.reqbase.css(__dirname + '/static'));
    app.use(autostatic.middleware());
    app.use(express.static(__dirname + '/static', conf.static_conf));
  }

  app.use(central.reqbase.errorHandler({ dump: conf.debug }));
  app.use(central.reqbase.errorHandler.notFound);

  // reference to the app running
  central.app = app;

  next && next(app);
}

// initial bootstraping
module.exports.boot = function() {
  var app = central.servers['www'] = bootServer('www', conf.port);

  var root_urls = {};
  conf.servers.forEach(function(item) {
    var hostname = item.hostname;
    central.servers[hostname] = server = bootServer(hostname, item.port, app);
    server.uri_root = item.root; // set the servers' uri root
    root_urls[hostname.toUpperCase() + '_ROOT'] = item.root;
  });

  vhosts.forEach(function(host) {
    var hostname = host[0];
    var server = host[1];
    server.log('info', 'vhosting..');
    app.use(express.vhost(hostname + '.' + central.rootDomain, server));
  });

  // server boot callbacks
  for (var hostname in central.servers) {
    var server = central.servers[hostname];
    // add helpers for server hosts
    server.locals(root_urls);
    server.ending && server.ending(server, app);
    // for garbage collection..
    delete server.ending;
  }

};

module.exports.central = central;

if (!module.parent) {
//setTimeout(function() {
  module.exports.boot();
//}, 20000);
}
