module.exports = function(option) {
  var self = this;
  return function reqbaseOpen(req, res, next) {
    if (res._opened) return next();
    else res._opened = true;

    if (res.ll_json) return next();

    var opt = option || res.ll_all || req.app.ll_all || {};

    res.charset = 'utf-8';
    res.contentType('html');

    // noting will be written for json format
    var head_tmpl = opt.head_tmpl || '_blocks/flush_head';
    res.ll_all = {};

    // copy data
    for (var key in opt) {
      res.ll_all[key] = opt[key];
    }

    if (opt.need_wait) {
      res._need_wait = true;
      return next();
    }

    // send the header
    res.render(head_tmpl, res.ll_all, function(err, ret) {
      if (err) return next(err);
      res.ll_out = ret;
      res.write(ret);
      next();
    });
  }
};
