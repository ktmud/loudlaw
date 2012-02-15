/**
* database connection management
*/
var cradle = require('cradle');

function Conn() {
  // current connection
  this.conn = null;
  this.dbs = {};
}

Conn.prototype = {
  // to setup some default configs like host and port
  setup: cradle.setup,

  // connect to a db, if not exist, create it
  db: function(dbname) {
    var conn = this.getConn();
    var db = conn.database(dbname);
    if (!this.dbs[dbname])
      this.dbs[dbname] = db;
    return db;
  },

  getConn: function() {
    return this.conn || (arguments && this.start.apply(this, arguments || this.args));
  },

  // start a connection
  start: function() {
    var args = Array.prototype.slice.apply(arguments);
    this.args = args;
    this.conn = new(cradle.Connection)(args[0], args[1], args[2]);
    return this.conn;
  }
};

module.exports = function() {
  var conn = new Conn();
  conn.start.apply(conn, arguments);
  return conn;
};
