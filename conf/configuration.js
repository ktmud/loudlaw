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

  u_s.defaults(conf, defaultConf);

  conf.env = NODE_ENV;

  // establish a database connection.
  conf.dbconn = conn.apply(conn, conf.db_args);

  // cryptokey for session
  conf.secret = createRandomString();

  return conf;
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
