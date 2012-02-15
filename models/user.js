var cwd = central.cwd;
var u_s = central.lib._;
var conf = central.conf;

var User = function(uinfo) {
  u_s.extend(this, uinfo);
  return this;
};

var proto = User.prototype;

Object.defineProperty(proto, 'isEditor', {
  get: function() {
    var roles = this.roles || [];
    return (roles && (roles.indexOf('editor') != -1)) || this.isAdmin;
  },
  enumerable: false
});
Object.defineProperty(proto, 'isAdmin', {
  get: function() {
    var roles = this.roles || [];
    return roles && roles.indexOf('admin') != -1;
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
