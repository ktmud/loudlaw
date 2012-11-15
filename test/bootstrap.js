process.env.NODE_ENV = process.env.MOCHA_ENV || 'test';

var util = require('util');
var zombie = require('zombie');

var app = require('../app');

app.boot();

exports.servers = {};
exports.Brower = zombie;
exports.browser = new zombie();
exports.log = function() {
  util.debug(util.inspect.apply(util, arguments));
};

var b = exports.browser;
b.loadCSS = false;
b.waitFar = 100;
b.site = central.conf.site_root;
