var util = require('util');

/**
 * some default settings
 */
module.exports = {
  worker: 4,
  // the port of the root server
  port: 3000,
  smtp: {
    host: 'smtp.exmail.qq.com',
    port: 587,
    use_authentication: true,
    ssl: true,
    user: 'support@dakanfa.com',
    pass: 'password here'
  },

  site_name: '大声看法',
  // assets file's root, for static file CDN.
  assets_root: 'http://a.idufa.com',
  admin_email: '"大声看法官方" <man@dakanfa.com>',
  sender_email: '"大声看法" <support@dakanfa.com>',
  site_root: 'http://www.dakanfa.com',
  good_domains: 'dakanfa.com 127.0.0.1 localhost loudlaw.org idufa-test.com',

  // can appoint a dedicated port for a subdomain
  servers: ['library'],

  // whether to send gzipped content
  gzip: true,
  super_cache: true,

  cache: {
    keysplitter: '-_-'
  },

  sessionStore: {
    memcached: true,
    dbname: 'sessions',
    // save session storage to file system every 30 minutes
    sync_time: 30
  },

  // params for connect to database
  db_args: [
    'https://law.ic.ht',
    '443',
    {
      auth: {
        username: 'jesse',
        password: 'hello'
      },
      cache: true,
      raw: false
    }
  ],

  db_prefix: '',

  salt: 'keyboard cat',

  // google analytics id
  ga_id: '',

  initSets: function(app, express) {
    app.enable('view cache');
    //app.use(express.logger('tiny'));
    //app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  },

  // do something after configurtion read,
  // and before app boot.
  afterBoot: function(app, express) {
    //app.error(function(err, req, res, next) {
      //if (err instanceof Error) {
        //res.render('500');
      //}
    //});
  }
};
