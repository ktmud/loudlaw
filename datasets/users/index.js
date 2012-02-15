var cwd = process.cwd();
var Dataset = require(cwd + '/lib/Dataset.js');
var User = require(cwd + '/models/user.js');
var util = require('util');

var gets = {
  // get user info by id
  id: function(keyinfo, next) {
    var self = this;
    var _id = keyinfo[0];
    self.db.get(_id, function(err, user) {
      if (err) {
        if (err.error == 'not_found') return next('no user', null);
        return next(err.error, null);
      }
      return next(null, user);
    });
  },
  // get user info by email
  email: function(keyinfo, next) {
    var self = this;
    var email = keyinfo[0];

    // find user by email
    self.db.view('user/email', {
      key: email
    }, function(err, ret) {
      if (err) return next(err);
      var user = ret && ret.rows && ret.rows[0];
      user = user && user.value;
      if (user) {
        next(err, user);
        self.stash(['id', user._id], user);
      } else {
        next('no user');
      }
    });
  },
  // get users by view
  by: function(keyinfo, next) {
    var self = this;
    var field = keyinfo[0];
    var val = keyinfo[1];

    self.db.view('users/by-' + field, { key: val }, function(err, user) {
      // save user details according to id
      // so next time `self.fetch({ keyinfo: ['id', ..] })`,
      // we will hit the cache.
      self.stash(['id', user._id], user);
    });
  }
};

var puts = {
  // update existing user
  id: function(keyinfo, doc, next) {
    var self = this;
    var _id = keyinfo[0];
    var _rev = doc._rev;

    delete doc._rev;

    self.db._save(_id, _rev, doc, function(err, res) {
      if (err) return next(err);
      if (!err && res && res.ok) {
        doc._id = res.id;
        doc._rev = res.rev;
      }
      next(err, doc);
      central.emit('user_updated', doc);
    });
  },
  new_bulk: function(bulk, next) {
    this.db.save(bulk, function(err, res) {
      next(err, res);
      central.emit('users_created', { res: res });
    });
  }
};

var more = {
  test_uid: function(uid) {
    if (uid.length < 3) return 'uid too short';
    if (/[^\w]/.test(uid)) return 'bad uid';
    var ban = central.conf.banwords;
    if (ban && ban instanceof Array) {
      ban = ban.join('|');
      ban = new RegExp('(' + ban + ')');
      if (ban.test(uid)) return 'illegal uid';
    }
  },
  // the screen name
  test_uname: function(uname) {
    if (uname.length < 2) return 'uname too short';
    if (uname.length > 20) return 'uname too long';
    var ban = central.conf.banwords;
    if (ban && ban instanceof Array) {
      ban = ban.join('|');
      ban = new RegExp('(' + ban + ')');
      if (ban.test(uname)) return 'illegal uname';
    }
  },
  test_email: function(email) {
    if (email.indexOf('@') == -1 ||
    email.split('@')[1].split('.').length < 2) return 'bad email';
  },
  test_password: function(pwd1, pwd2) {
    if (pwd2 && pwd2 != pwd1) return 'password differ';
    if (pwd1 < 4) return 'weak password';
  },
  findOrCreate: function(uid, info, next) {
    var self = this;

    self.db.update('user/touch', uid, info, function(err, user) {
      if (user) {
        // save it to cache
        self.stash(['id', user._id], user);
        return next(err, new User(user));
      }
      if (err) {
        util.debug(err);
        err = 'save fail';
      }
      return next(err);
    });
  },
  findOne: function(uid, next) {
    var self = this;
    if (self.test_email(uid)) {
      return self.findById(uid, next, true);
    } else {
      // test shows that this is an email
      return self.findByEmail(uid, next);
    }
  },
  // shorthand
  findById: function(id, next) {
    // find user by id
    var err = this.test_uid(id);
    if (err) {
      next(err);
      return;
    }
    this.fetch(['id', id], function(err, user) {
      if (!user || !user._id) return next('no user');
      next(err, user);
    });
  },
  findByEmail: function(email, next, noTest) {
    if (!noTest) {
      var err = this.test_email(email);
      if (err) return next(err);
    }
    this.fetch(['email', email], function(err, user) {
      if (!user || !user._id) return next('no user');
      next(err, user);
    });
  },
  create: puts.new,
  merge: function() {
    var db = this.db;
    db.merge.apply(db, arguments);
  }
};

module.exports = central.lib._.extend(new Dataset({
  // how to fetch the original data
  gets: gets,
  puts: puts,
  // TODO: this.fetch return modeled user
  model: User,
  // default pulse size is 20
  //pulse_size: 20,
  // default pulse interval
  // send data every 30 seconds
  //pulse_interval: {
//_default: 30
  //}
  _design: require('./_design'),
  dbname: 'users'
}), more);
