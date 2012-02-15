var dataset;

function normalize_sort(sort) {
  // sort=title_asc  ascending by title
  // sort=title_     ascending by title
  // sort=title_desc descending by title
  // sort=title_xxx  descending by title
  // sort=title      descending by title
  var tmp = sort.split('_');
  var descending = (tmp.length < 2 || (tmp[1] && tmp[1] != 'asc')) ? true : false;
  sort = tmp[0] + (descending ? '' : '_asc');
  return sort;
}

function random_tags(limit, fn) {
  central.modules.tag.dataset.bulk({
    for: 'library',
    random: true,
    limit: limit
  }, fn);
}

module.exports = function(central, app, dataset) {
  var Pager = central.lib.Pager;

  function popular_articles(limit, fn) {
    dataset.fetch(['list', 'type', '', 'hits', 1, limit], fn);
  }

  app.get('/library', function(req, res, next) {
    res.ll_write('library/index', {
      pipefy_js: central.lazylib.bigpipe,
      statusCode: 200,
      types: keynameMap['type'],
      cates: keynameMap['cate']
    });
    next();
  }, function(req, res, next) {
    var counter = 5;
    function countDown() {
      counter--;
      if (counter <= 0) next();
    };

    random_tags(20, function(err, tags) {
      res.ll_write('library/index/mods/tags', {
        pagelet: {
          id: 'mod-tags'
        },
        data: tags || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'law', 'hits', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-hot-law'
        },
        hd: '热门法律',
        data: docs && docs.list || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'law', 'default', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-latest-law'
        },
        hd: '最新法律',
        data: docs && docs.list || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'itpt', 'hits', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-hot-itpt'
        },
        hd: '热门司法解释',
        data: docs && docs.list || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'itpt', 'default', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-latest-itpt'
        },
        hd: '最新司法解释',
        data: docs.list || []
      });
      countDown();
    });
  }, central.reqbase.close());

  // the request looks like:
  // /library/cate-32/by-default/page-5
  //var urlReg = /^\/library\/by-(?:([a-zA-Z0-9]+))(?:\/([a-zA-Z0-9]+))(?:\/page-([\d]+))?(?:\.([\w]+))?/;
  var urlReg = /^\/library(?:\/([a-zA-Z0-9]+)-([^\/]+))?(?:\/by-([a-zA-Z0-9\_\-]+))?(?:\/p([\d]+))?(?:\.([\w]+))?$/;

  app.get(urlReg, function(req, res, next) {
    var params = req.params;
    var view = params[0];
    var key = params[1];
    var sort = normalize_sort(params[2] || 'default');
    var page = req.params.page = (parseInt(params[3] || req.param('p'), 10) || 1);
    var perpage = parseInt(req.param('perpage'), 10) || 12;

    var cacheKey = ['list', view, key, sort, page, perpage];
    var viewInfo;

    if (view == 'tag') {
      central.modules.tag.get(key, function(err, data) {
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
        data.title = viewInfo.name
        res.ll_render('library/list/' + view, {
          carnonical: '/library/list/' + view + '-' + key + '/by-' + sort + '/p' + page,
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

