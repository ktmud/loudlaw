module.exports = function() {
  return function reqbaseFiletype(req, res, next) {
    var fext = req.format || req.param('format') || '';
    if (!fext) {
      var path = req.url.split('?')[0] || '';
      fext = path.slice(path.lastIndexOf('.') + 1);
      if (fext === path) fext = '';
    }

    var need_json = req.xhr || (!req.accepts('html') && req.accepts('json'));
    // should we render main data as json or not?
    res.ll_json = need_json || (fext && fext.toLowerCase() === 'json');

    if (res.ll_json) fext = 'json';

    switch (fext) {
      case 'json':
      case '':
        break;
      case 'md':
        res.ll_txt = fext;
        res.contentType('text');
        break;
      case 'pdf':
        res.ll_stream = true;
        res.contentType('application/octet-stream');
        break;
      default:
      var reg = new RegExp('\\.' + fext + '$');
      if (reg.test(req.url)) {
        return res.redirect(req.url.replace(reg, ''));
      }
    }

    res.ll_all = {};
    next();
  }
};
