var dataset = central.datasets.tags;
var Pager = central.lib.Pager;

function show_tags(req, res, next) {
  var params = req.params;
  var subsite = req.params.subsite;
  var sort = params[2] || 'default';
  var page = parseInt(params[3]) || 1;
  var perpage = parseInt(req.param('perpage')) || 500;

  var cache_key = ['list', 'for', subsite, sort, page, perpage];
  dataset.fetch(cache_key, function(err, data) {
    if (err) return next(err);

    var total = data.total;

    var alphabetical = {};

    data.list.forEach(function(item) {
      var az = item._id[0].toUpperCase();
      var entries = alphabetical[az] || (alphabetical[az] = []);
      entries.push(item);
    });

    var baseUrl = '/tags';
    res.ll_render(subsite + '/tags', {
      subsite: subsite,
      action: req.params.act,
      userActions: res.userActions,
      baseUrl: baseUrl,
      carnonical: baseUrl + '/by-' + sort + '/p' + page,
      total: total,
      page: page,
      pager: new Pager(req.originalUrl, page, perpage, total, true),
      data: alphabetical
    });
  });
}

module.exports = {
  tags: show_tags
};
