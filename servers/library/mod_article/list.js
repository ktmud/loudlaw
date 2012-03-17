module.exports = function(central, app, dataset) {
  var self = this;
  var Pager = central.lib.Pager;
  var dataset_tags = central.datasets.tags;
  var keynameMap = this.keynameMap;

  function popular_articles(limit, fn) {
    dataset.fetch(['list', 'type', '', 'hits', 1, limit], fn);
  }

  // the request looks like:
  // /library/cate-32/by-default/page-5
  //var urlReg = /^\/library\/by-(?:([a-zA-Z0-9]+))(?:\/([a-zA-Z0-9]+))(?:\/page-([\d]+))?(?:\.([\w]+))?/;
  var urlReg = /^\/([a-zA-Z0-9]+)-([^\/]+)(?:\/by-([a-zA-Z0-9\_\-]+))?(?:\/p([\d]+))?(?:\.([\w]+))?$/;

  app.get(urlReg, function(req, res, next) {
    var params = req.params;
    var view = params[0];
    var key = params[1];
    var sort = self.normalize_sort(params[2] || 'default');
    var page = req.params.page = (parseInt(params[3] || req.param('p'), 10) || 1);
    var perpage = parseInt(req.param('perpage'), 10) || 12;

    var cacheKey = ['list', view, key, sort, page, perpage];
    var viewInfo;

    if (view === 'tag') {
      dataset_tags.get(key, function(err, data) {
        if (err) return next(err);
        viewInfo = data;
        go_fetch();
      });
      return;
    }

    viewInfo = keynameMap[view] && keynameMap[view][key] && { name: keynameMap[view][key] };

    if (viewInfo) {
      go_fetch();
    } else {
      next(404);
    }

    function go_fetch() {
      if (!viewInfo) return next('route');

      dataset.fetch(cacheKey, function(err, data) {
        if (err) {
          if (err === 404 || err === 'not_found') {
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
        data.title = viewInfo.name
        res.ll_render('library/list/' + view, {
          carnonical: '/library/list/' + view + '-' + key + '/by-' + sort + '/p' + page,
          desc: '大声看法法律文库，互联网上最牛逼的法律法规大全。提供最便捷的法条检索工具。此页是#{title}相关的法律法规列表。',
          data: data,
          title: data.title + (page > 1 ? '(第' + page + '页)' : ''),
          viewInfo: viewInfo,
          pager: new Pager(req.originalUrl, page, perpage, total, true),
          total: total
        });
      });
    }
  });
};

