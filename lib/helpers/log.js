var util = require('util');

var debug = require('debug');

var debugs = {};

var colors = {
  debug: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red'
};

module.exports = {
  debug: debug('loudlaw'),
  log: function(msg) {
    util.log(msg);
  },
  applog: function(type) {
    var args = Array.prototype.slice.call(arguments);
    var n = 'loudlaw' + (this.hostname ? ':' + this.hostname : '');
    var fn = debugs[n] || (debugs[n] = debug(n));
    fn.apply(this, args);
  }
};
