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
      res.ll_write('library/search/results', {
        pagelet: {
          id: 'results'
        },
        pager: new Pager(req.originalUrl, page, perpage, results.total, false),
        data: results
      });
      next();
    });
  }, central.reqbase.close({
    nofoot: true
  }));
};

