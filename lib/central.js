var events = require('events');
var central = new events.EventEmitter();
var u_s = require('underscore');
var fs = require('fs');
var cwd = central.cwd = process.cwd();

central.lib = {
  '_': u_s,
  Pager: require(cwd + '/utils/Pager')
};

var helpers = central.helpers = central.utils = require('./utils.js');
central.log = helpers.applog;

// read those libs as string, never parse
central.lazylib = {
  'pinyin': fs.readFileSync(cwd + '/utils/pinyin.js', 'utf-8')
};

/**
* used as an express middleware
*/
//central.router = function (req, res, next) {
  //var route = central._match_route(req);
  //// if we got the match
  //if (route) {
    //var m = req.url.match(route.regExp);
    //m.shift();
    //// save params
    //m.forEach(function(item, i) {
      //req.params[i] = item;
    //});

    //var last = route.callbacks.length - 1;

    //if (last == -1) return next();

    //// execute routes functions
    //route.callbacks.forEach(function(item, i) {
      //var cb = (i == last) ? next : function() {};
      //item.call(central.app, req, res, cb);
    //});
  //} else {
    //next();
  //}
//};

/**
* to store the global routes
*/
//central._routes = [];

/**
* match the global router
* @param {string} req the request object.
*/
//central._match_route = function(req) {
  //var routes = central._routes;
  //for (var i = 0, len = routes.length; i < len; i++) {
    //route = routes[i];
    //if (route.method == 'all' || route.method === req.method.toLowerCase()) {
      //if (route.regExp.test(req.url)) {
        //return route;
        //break;
      //}
    //}
  //}
//};

//central.addRoute = function() {
  //var args = Array.prototype.slice.apply(arguments);
  //var route = {
    //method: args.shift()
  //};
  //var regExp = args.shift();
  //if (!(regExp instanceof RegExp)) {
    //regExp == new RegExp(regExp);
  //}
  //route.regExp = regExp;
  //route.callbacks = args;
  //central._routes.push(route);
//};

/**
* modules holders.
*/
central.modules = {};

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

/**
* init modules.
*/
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

function MyException() {
}

central.servers = [];
central.datasets = {};

central.on('silent-error', function(msg) {
  central.utils.debug('[error]: '.red + msg);
  console.trace();
});
// we just had a global event handler.
/**
* export message center.
*/
module.exports = central;
