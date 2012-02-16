var SITE_NAME = central.conf.site_name;
var exception_msgs = require(central.cwd + '/conf/exception_msgs.js');

var exports = {
  init: function(central, app) {
    var u_s = central.lib._;
    var reqbase = central.reqbase;

    // 500 / 403 page
    app.error(function appError(err, req, res, next) {
      if (err == 403) {
        res.ll_render('403', {
          statusCode: 403,
          data: { r: 1, err: err, title: '没有权限' }
        });
        return;
      }
      if (err == 404 || err == 'not_found') {
        res.ll_render('404', {
          statusCode: 404,
          data: { r: 1, err: err, title: '找不到' }
        });
        return;
      }
      if (err.stack) {
        console.log(err.stack);
      } else {
        console.log(err);
        console.trace();
      }
      if (typeof err == 'string') {
        res.ll_exception = err;
      } else {
        res.ll_exception = (err.name || err.reason);
      }
      req.session.onesalt = Date.now();
      if (res.headerSent) {
        res.end();
        return;
      }

      res.ll_render('500', {
        onesalt: req.session.onesalt,
        statusCode: 500,
        data: { r: 1, err: err, title: '服务器错误' },
        err: err,
        stack: err.stack
      });
    });
  }
};

module.exports = exports;
