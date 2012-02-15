/**
* Module dependencies.
*/
var passport = require('passport') , util = require('util');

function Strategy(verify) {
  this._uidField = 'uid';
  this._passwordField = 'password';

  passport.Strategy.call(this);

  this.name = 'local';
  this.verify = verify;
}

/**
* Inherit from `passport.Strategy`.
*/
util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function(req) {
  var self = this;

  function retry(msg, user) {
    req.ll_exception = msg;
    req.user = user;
    self.fail();
  }

  if (!req.body) {
    return self.fail();
  }
  var uid = req.body[self._uidField];
  if (!uid) {
    return retry('uid required');
  }
  var password = req.body[self._passwordField];
  if (!password) {
    return retry('password required');
  }

  self.verify(uid, password, function(err, user) {
    if (err) return retry(err, user);
    if (!user) return retry('login failed');
    self.success(user);
  });
};

/**
* Expose `Strategy`.
*/ 
module.exports = Strategy;
