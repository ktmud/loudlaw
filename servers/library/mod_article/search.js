var markdown = require(central.cwd + '/utils/markdown');

module.exports = function(central, app, dataset) {
  var Pager = central.lib.Pager;

  app.all('/search/:keyword?', app.rq_cache, app.rq_open,
  function(req, res, next) {
    var keyword = req.params.keyword || req.param('q');
    req.params.keyword = keyword;
    res.ll_write('library/search', {
      pipefy: true,
      keyword: keyword,
      statusCode: 200
    });
    next();
  }, function(req, res, next) {
    var keyword = req.params.keyword;
    if (!keyword) return next();
    var sort = req.param('sort') || '';
    var page = req.param('p') || 1;
    var perpage = req.param('perpage') || 10;
    dataset.fetch(['search', 'all_fields', keyword, sort, page, perpage], function(err, results) {
      res.ll_exception = (err && err.reason) || (!results && 'unknown');
      results = results || {};

      var list = results.list;
      if (list) {
        var item;
        var strip_html = central.helpers.strip;
        //try {
          for (var i in list) {
            item = list[i];
            if (!item.fields) continue;
            item.fields.content = strip_html(item.fields.content, true);
          }
        //} catch (e) {}
      }
      res.ll_write('library/search/results', {
        pagelet: {
          id: 'results'
        },
        pager: new Pager(req.originalUrl, page, perpage, results.total, false),
        q: keyword,
        sort: sort,
        perpage: perpage,
        data: results
      });
      next();
    });
  }, central.reqbase.close({
    nofoot: true
  }));
};

