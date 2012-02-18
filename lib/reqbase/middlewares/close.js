module.exports = function(option) {
  return function reqbaseClose(req, res, next) {
    if (res.ll_json || res.ll_txt) return res.end();
    var opt = option || {};

    var foot_tmpl = opt.foot_tmpl || '_blocks/flush_foot';

    var all_data = res.ll_all;

    for (var key in opt) {
      if (!(key in res.ll_all)) res.ll_all[key] = opt[key];
    }

    // global error handling
    if (all_data.err) {
      // don't save cache
      req.cache_key = null;
      var err = normalize_err(all_data.err);

      res.partial('500', all_data, function(err, ret) {
        if (err) return next(err);
        if (ret) res.write(ret);
        next();
      });
    }
    if (opt.nofoot) return res.end();

    res.partial(foot_tmpl, all_data, function(err, ret) {
      if (err) return next(err);
      if (ret) {
        res.ll_out += ret;
        res.write(ret);
      }
      res.end();
    });
  }
};

