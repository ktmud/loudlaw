var exception_msgs = require(central.cwd + '/conf/exception_msgs.js');

module.exports = function(options) {
  options = options || {};

  // 500 / 403 page
  return function appError(err, req, res, next) {
    if (err == 403) {
      res.ll_render('403', {
        statusCode: 403,
        data: { r: 1, err: err, title: '没有权限' }
      });
      return;
    }

    if (err == 404 || err === 'not_found') {
      return notFound(req, res, next);
    }

    if (err.stack) {
      req.app.log('error', err.stack);
    } else {
      req.app.log('error', err);
    }

    if (typeof err === 'string') {
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
      stack: options.dump && err.stack
    });
  }
};

var notFound = module.exports.notFound = function(req, res, next) {
  if (req.method == 'HEAD') {
    return next();
  }
  res.ll_render('404', {
    statusCode: 404,
    data: { r: 1, err: 404, title: '找不到' }
  });
};

