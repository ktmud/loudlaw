var u_s = require('underscore');

var app;

/**
* handle the routes.
* @param {object} ap refference to the express app.
* @constructor
*/
module.exports = function(ap) {
  function F() {
    app = ap;
  }
  F.prototype = proto;

  return new F();
};

