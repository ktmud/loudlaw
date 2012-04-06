/**
* red configuration for different environment.
*/
var u_s = require('underscore');
var conn = require('../lib/Conn.js');

/**
* export configurations.
*/
module.exports = readConfig();

/**
* read config from conf.js
* @return {object} express settings.
*/
function readConfig() {
  var NODE_ENV = global.process.env.NODE_ENV || 'development';
  var defaultConf = require('./default.conf.js');
  var conf = require('./' + NODE_ENV + '.conf.js');

  conf.__proto__ = defaultConf;

  //u_s.defaults(conf, defaultConf);

  // establish a database connection.
  conf.dbconn = conn.apply(conn, conf.db_args);

  // cryptokey for session
  conf.secret = createRandomString();

  parseDomain(conf);

  return conf;
}

function parseDomain(conf) {
  var rootDomain = conf.site_root.replace(/https?:\/\//i, '').split(':')[0] || 'localhost';
  conf.rootDomain = rootDomain = rootDomain.split('.').slice(1).join('.') || rootDomain;

  // analyse how many serves do we get
  if (conf.servers && conf.servers.length) {
    conf.servers.forEach(function(arg, i) {
      var obj = {}; // config object
      if (arg instanceof Array) {
        obj.hostname = arg[0];
        obj.port = arg[1];
        obj.isProxied = arg[2] || false;
      } else {
        obj.hostname = arg;
      }
      var port_suffix = conf.isProxied ? '' : (':' + (obj.port || conf.port));
      obj.root = 'http://' + obj.hostname + '.' + rootDomain + port_suffix;
      conf.servers[i] = obj;
    });
  }
}

/**
* Random string for cryptoKey
* @return {string} randomString.
*/
function createRandomString() {
  var chars = '0123456789;[ABCDEFGHIJKLMfi]NOPQRSTUVWXTZ#&*abcdefghiklmnopqrstuvwxyz';
  var string_length = 10;
  var randomString = '';
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(rnum, rnum + 1);
  }
  return randomString;
}
