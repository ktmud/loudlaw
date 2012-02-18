var conf = central.conf;
var reg_val = /#{(.+?)}/g;

module.exports = function(app) {
  app.helpers({
    DEBUG: central.DEBUG,
    SITE_ROOT: conf.site_root,
    SITE_NAME: conf.site_name,
    trunc: central.helpers.trunc,
    highlight: central.helpers.highlight,
    _: central.lib._,
    GA_ID: conf.ga_id
  });
  app.dynamicHelpers({
    ASSETS_ROOT: function(req) {
      return req.header('ngx_ssl') ? '' : conf.assets_root;
    },
    title: function(req, res) {
      return (res.ll_all && res.ll_all.title) ||
      res.title || conf.SITE_NAME;
    },
    bodyClass: function(req, res) {
      return (res.ll_all && res.ll_all.bodyClass) || res.bodyClass;
    },
    user: function(req) {
      return req.user;
    },
    req_url: function(req) {
      return req.originalUrl;
    },
    ck: function(req, res) {
      return req.session._csrf;
    },
    ll_exception: function(req, res) {
      var ll_exception = req.ll_exception || res.ll_exception || '';
      if (ll_exception) central.utils.log(req.url + ': ' + ll_exception);
      return ll_exception;
    },
    msg: function(req, res) {
      var ll_exception = req.ll_exception || res.ll_exception;
      return ll_exception && exception_msgs[ll_exception];
    },
    referrer: function(req) {
      return req.header('referrer') || '';
    },
    // inline static
    istatic: function(req, res) {
      return function istatic(filepath, forceReload) {
        var locals = this;
        var str = central.istatic.apply(central, arguments) || '';
        // replace inlined arguments
        if (str.indexOf('#{') > -1) {
          str = str.replace(reg_val, function(m0, m1) {
            // looks like dangerous...
            var fn = new Function('locals', 'with (locals) { return ' + m1 + '; }');
            return fn(locals);
          });
        }
        return str;
      };
    }
  });
};
