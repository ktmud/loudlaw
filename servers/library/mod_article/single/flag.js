var sendmail = require(central.cwd + '/utils/sendmail');

module.exports = function handle_flag(req, res, next) {
  if (req.method !== 'POST') return next();

  var detail = req.body.detail || '';
  detail = detail.trim();
  if (!detail) {
    res.ll_exception = 'flag detail required';
    return next();
  }
  if (detail.length < 6) {
    res.ll_exception = 'flag detail too short';
    return next();
  }
  var info = req.body;
  var onesalt = req.session.onesalt;
  if (info.onesalt != onesalt) {
    res.ll_exception = 'bad request';
    return next();
  }
  var last_report = req.session.last_report;
  if (last_report === detail) {
    res.ll_exception = 'flag reported';
    return next();
  }
  req.session.last_report = detail;
  info.userId = req.user && req.user.id;
  info.timestamp = central.utils.timestamp();
  info.article_title = res.article_doc.title;
  info.pre = req.app.uri_root + req.originalUrl.replace('/flag', '');
  info.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  sendmail.send_article_error(info, function(err, success) {
    if (err) {
      res.flag_msg = err;
    }
    if (success) {
      res.flag_msg = 'ok';
      return next();
    }
    return next();
  });
};
