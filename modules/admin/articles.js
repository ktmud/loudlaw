module.exports = function(central, app) {
  var Pager = central.lib.Pager;

  var dataset = require(central.cwd + '/datasets/articles');
  // manage article articles

  var urlReg = /^\/adm\/articles(?:\/by-([a-zA-Z0-9\_\-]+))?(?:\/p([\d]+))?(?:\.([\w]+))?$/;

  app.all(urlReg, function(req, res, next) {
    var sort = req.params[0] || 'default';
    var page = req.params[1] || 1;
    var perpage = req.param('perpage') || 15;
    var cate = req.param('cate') || '';
    var view = ['all_docs'];
    if (cate) view = ['list', 'cate', cate];
    var cacheKey = view.concat([sort, page, perpage]);

    var viewInfo = { name: '所有文章' };

    dataset.fetch(cacheKey, function(err, data) {
      if (err) {
        if (err == 404 || err == 'not_found') {
          res.statusCode = 404;
          res.ll_render('library/list/' + view, {
            data: { r: 0, msg: 'empty collection', title: viewInfo.name, list: [] },
            total: 0,
            viewInfo: viewInfo,
            title: viewInfo.name
          });
          return;
        }
        return next(err);
      }

      var total = data.total;
      data.title = viewInfo.name;
      res.ll_render('admin/articles', {
        data: data,
        title: data.title + (page > 1 ? '(第' + page + '页)' : ''),
        viewInfo: viewInfo,
        pager: new Pager(req.originalUrl, page, perpage, total, true),
        total: total
      });
    });
  });
};
