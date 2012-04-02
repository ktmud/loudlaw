var cwd = central.cwd;
var u_s = central.lib._;
var conf = central.conf;

var User = function(uinfo) {
  u_s.extend(this, uinfo);
  return this;
};

var proto = User.prototype;

Object.defineProperty(proto, 'is', {
  get: function() {
    return function(role) {
      var roles = this.roles || [];
      // admin is everything...
      return ~roles.indexOf(role) || ~roles.indexOf('admin');
    };
  },
  enumerable: true
});
Object.defineProperty(proto, 'isEditor', {
  get: function() {
    return this.is('editor');
  },
  enumerable: false
});
Object.defineProperty(proto, 'isAdmin', {
  get: function() {
    return this.is('admin');
  },
  enumerable: false
});
Object.defineProperty(proto, 'url', {
  get: function() {
    return [conf.SITE_ROOT, 'user', this._id].join('/');
  },
  enumerable: false
});
Object.defineProperty(proto, 'uid', {
  get: function() {
    return this._id;
  },
  enumerable: false
});
Object.defineProperty(proto, 'email', {
  get: function() {
    return this.email || this._id;
  },
  enumerable: true
});

function slugfy(str) {
  return str && str.toLowerCase().replace(/\s+/g, '-');
}

module.exports = User;
