var conf = central.conf;
var reg_val = /#{(.+?)}/g;
var exception_msgs = central.exception_msgs;

// export static file version as json, for use of seajs alias
function make_aliases() {
  var etags = central.autostatic.manager.etags;
  var prefix = central.autostatic.root || central.autostatic.direct;
  var ret = {};
  for (var i in etags) {
    var tmp = i.split('.');
    if (tmp.pop() == 'js') {
      var j = tmp.join('.').replace('/js/', '');
      ret[j] = prefix + i + '?' + etags[i];
    }
  }
  return ret;
}

module.exports = function(app) {
  app.locals({
    static: central.autostatic.serve,
    istatic: central.istatic.serve(),
    seajs_alias: function() {
      return JSON.stringify(make_aliases());
    },
    DEBUG: central.DEBUG,
    SITE_ROOT: conf.site_root,
    SITE_NAME: conf.site_name,
    trunc: central.helpers.trunc,
    strip: central.helpers.strip,
    substitute: central.helpers.substitute,
    highlight: central.helpers.highlight,
    _: central.lib._,
    GA_ID: conf.ga_id
  });

  app.locals(function(req, res) {
    var locals = res.locals;
    locals.req = req;
    locals.res = res;
    locals.ASSETS_ROOT = req.header('ngx_ssl') ? '' : conf.assets_root;
    locals.title = (res.ll_all && res.ll_all.title) ||
      res.title || conf.SITE_NAME;
    locals.bodyClass = (res.ll_all && res.ll_all.bodyClass) || res.bodyClass;
    locals.user = req.user;
    locals.req_url = req.originalUrl;
    locals.ck = req.session._csrf;

    var ll_exception = locals.ll_exception = req.ll_exception || res.ll_exception || '';
    if (ll_exception) {
      central.utils.log(req.url + ': ' + ll_exception);
      locals.msg = exception_msgs[ll_exception];
    } else {
      locals.msg = '';
    }
    locals.referrer = req.get('referrer') || '';
  });
};
