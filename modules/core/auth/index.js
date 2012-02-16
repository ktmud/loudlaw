var util = require('util');
var debug = util.debug;
var log = util.log;
var format = util.format;
var cwd = process.cwd();

var app = central.app;
var reqbase = central.reqbase;
var u_s = central.lib._;
var passport = central.lib.passport;

var SITE_NAME = central.conf.site_name;
var SITE_ROOT = central.conf.site_root || '';

var bcrypt = require('bcrypt');
var LocalStrategy = require('./strategy.js');
var dataset = require(cwd + '/datasets/users');

var all_urls = /\/(login|register|logout|set-password|forget-password)/;

var good_domains = central.conf.good_domains || '';
good_domains = good_domains.replace('.', '\\.').split(/\s+/);
good_domains.forEach(function(domainName, i) {
  good_domains[i] = '[\\w\\.]*' + domainName;
});
var host_regexp = new RegExp(
  '^https?://(' + good_domains.join('|') + ')[:/]'
);
var CP_HOME = '/welcome-back';

var passportInited = false;
function initPassport(app) {
  if (passportInited) return;

  passportInited = true;

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    dataset.findOne(id, done);
  });

  passport.use(new LocalStrategy(function passCheck(id, password, done) {
    process.nextTick(function() {
      // find out this user
      dataset.findOne(id, function(err, user) {
        if (err) return done(err);
        if (!user) return done('no user');
        if (!user.hash) return done('no password', user);
        bcrypt.compare(password, user.hash, function(err, res) {
          if (err) return done(err);
          if (res) return done(null, user);
          return done('wrong password', user);
        });
      });
    });
  }));
}

function local_auth(req, res, next) {
  passport.authenticate('local', function(err, user, profile) {
    if (err) {
      req.ll_exception = err;
      return next(); // will render the login page with error message
    }
    if (user) {
      req.login(user, function(err) {
        if (err) {
          req.ll_exception = err;
          return next();
        }
        // to remember this user, set a cookie
        if (req.param('rem')) {
          req.session.cookie.expires = new Date(Date.now() + 2592000000);
          req.sessionStore.toFile();
        } else {
          req.session.cookie.expires = false;
        }
        log('[user ' + user._id + '] logined.');
        res.cookie('lg', '1');
        res.redirect(get_redirect_url(req, SITE_ROOT + CP_HOME));
      });
      return;
    }
    next();
  })(req, res, next);
}

function simple_crypt(str, salt) {
  var str = escape(str), ret = '';
  for (var i = str.length - 1; i >= 0; i--) {
    ret += String.fromCharCode(str.charCodeAt(i) + 5);
  }
  return escape(ret);
}

function simple_decrypt(str, salt) {
  var str = unescape(str), ret = '';
  for (var i = str.length - 1; i >= 0; i--) {
    ret += String.fromCharCode(str.charCodeAt(i) - 5);
  }
  return unescape(ret);
}

function init(central, app, mod) {
  var self = this;
  var reqbase = central.reqbase;

  initPassport(app);

  // routes ==========
  // parse js encoded password
  app.post(all_urls, function(req, res, next) {
    var crypt_pwd = req.body.crypt_pwd;
    if (crypt_pwd) {
      req.password = simple_decrypt(crypt_pwd, req.body.uid);
    }
    next();
  });
  app.post('/login', local_auth, function(req, res, next) {
    var _id = req.user && req.user._id;

    if (req.ll_exception == 'no password' && _id) {
      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      var key = bcrypt.hashSync((_id + ip), bcrypt.genSaltSync(5));
      central.cache.save(key, _id, { life: 60 });
      // set password like 24 hour
      central.cache.toFile(key, { life: 1 });
      res.redirect(SITE_ROOT + '/set-password?key=' + key);
      return;
    }
    next();
  });

  app.post('/register', function(req, res, next) {
    var uid = req.body.uid || req.query.uid;
    var email = req.body.email || req.query.email;
    var password = req.password || req.body.password;
    var crypt_pwd2 = req.param('crypt_pwd2');
    if (crypt_pwd2) {
      req.password2 = simple_decrypt(crypt_pwd2, uid);
    }
    var password2 = req.password2 || req.body.password2;

    var err;
    if (!uid) {
      err = 'uid required';
    } else if (!email) {
      err = 'email required';
    } else if (!password) {
      err = 'password required';
    } else if (!password2) {
      err = 'password2 required';
    } else {
      err = dataset.test_uid(uid) || dataset.test_email(email) ||
      dataset.test_password(password, password2);
    }

    if (err) {
      req.ll_exception = err;
      return next();
    }

    // check whether user exists first
    dataset.db.query('HEAD', uid, function(err, resp, status) {
      if (status != 404) {
        req.ll_exception = 'uid exists';
        return next();
      }

      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      var uinfo = {
        uid: uid,
        hash: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
        email: email,
        ip: ip
      };

      dataset.findOrCreate(uid, uinfo, function(err, user) {
        if (err) {
          req.ll_exception = err;
          return next();
        }

        log(format('[user %s] joined at %s', uid.green, (new Date(user.ctime)).toLocaleString()));

        // register ok
        req.login(user, function(err) {
          if (err) {
            req.ll_exception = err;
            return next();
          }
          res.cookie('lg', '1');
          req.sessionStore.toFile();
          res.redirect(get_redirect_url(req, SITE_ROOT + '/welcome'));
        });
      }, true);
    });
  });

  app.all('/logout', function(req, res, next) {
    // clear cache
    req.user && dataset.unstash(['id', req.user.id]);
    res.cookie('lg', '1');
    req.logOut();
    req.sessionStore.toFile();
    res.redirect(get_redirect_url(req, '/login'));
  });

  app.all(all_urls, reqbase.ft(), reqbase.open({
    ssl_form: central.conf.env == 'vps',
    css: 'account',
    bodyClass: 'account',
    need_wait: true
  }));

  app.all('/login', function(req, res, next) {
    var uname = req.user && req.user.uname;
    var pre = req.param('pre') || req.header('referrer');

    res.ll_render('account/login', {
      title: '登录 | ' + SITE_NAME,
      pre: pre,
      user: req.user,
      uname: uname,
      uid: req.body.uid || req.query.uid
    });
  });

  app.all('/register', function(req, res, next) {
    var title = '注册 | ' + SITE_NAME;
    var uid = email = req.query.uid;
    if (uid) {
      // test as email and find error,
      // so it is not email
      if (dataset.test_email(uid)) {
        email = null;
      } else {
        uid = null;
      }
    }

    res.ll_render('account/register', {
      //layout: '_layouts/nohead',
      user: req.user,
      uid: req.body.uid || uid,
      email: req.body.email || email,
      title: title
    });
  });

  app.get('/welcome', function(req, res, next) {
    var user = req.user;
    // new user don't have revision info
    if (!user || user._rev) {
      return res.redirect('/');
    }

    res.ll_render('account/welcome', {
      uname: user.uname || user.uid
    });
  });

  app.get('/welcome-back', self.restrict(), function(req, res, next) {
    var user = req.user;
    res.ll_render('account/welcome-back', {
      pre: req.param('pre'),
      uname: user.uname || user.uid,
      title: '欢迎回来'
    });
  });

  // open auth from other sites
  app.all('/auth/:login_with/callback', function(req, res, next) {
    req.authenticate(req.params.login_with, function() {
      res.redirect(req.body.pre || CP_HOME);
    });
    next();
  });
}

function get_redirect_url(req, defUrl) {
  var url = req.param('pre') || req.header('referrer');

  if (!host_regexp.test(url) || all_urls.test(url)) url = '';

  url = url || defUrl || '/';

  return url;
}

module.exports = {
  _dir: __dirname,
  restrict: function(opt) {
    opt = opt || {};
    return function(req, res, next) {
      if (req.user) {
        if (opt.editor) {
          if (req.user.isEditor) return next();
        } else if (opt.admin) {
          if (req.user.isAdmin) return next();
        } else {
          return next();
        }
      }

      var redirectTo = '/login';
      if (typeof opt.redirect == 'string') redirectTo = opt.redirect;
      if (redirectTo) {
        return res.redirect(redirectTo);
      } else {
        res.statusCode = 403;
      }

      // not showing any thing
      if (!opt.custom) {
        return next(403);
      }

      // let coming up middlewares
      // decide how to show a tip page
      next();
    };
  },
  dataset: dataset,
  init: init
};
