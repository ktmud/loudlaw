var util = require('util');

var colors = {
  debug: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red'
};

module.exports = {
  debug: function(msg) {
    if (central.conf.debug) console.log('[debug]:'.blue, msg);
  },
  log: function(msg) {
    util.log(msg);
  },
  applog: function(type) {
    var args = Array.prototype.slice.call(arguments);
    var host = this.hostname ? (this.hostname.cyan + ' ~ ') : '';
    if (args.length === 1) {
      type = 'info';
      args[1] = args[0];
    }
    if (!type in colors) type = 'debug';
    args[0] = host + (type + ' -')[colors[type]];
    console[type].apply(console, args);
  }
};
