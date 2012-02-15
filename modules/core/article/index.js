module.exports = {
  _dir: __dirname,
  normalize_sort: function(sort) {
    // sort=title_asc  ascending by title
    // sort=title_     ascending by title
    // sort=title_desc descending by title
    // sort=title_xxx  descending by title
    // sort=title      descending by title
    var tmp = sort.split('_');
    var descending = (tmp.length < 2 || (tmp[1] && tmp[1] != 'asc')) ? true : false;
    sort = tmp[0] + (descending ? '' : '_asc');
    return sort;
  },
  dataset: central.datasets.articles,
  init: function(central, app, opts) {
    var reqbase = central.reqbase;
    var dataset = this.dataset;

    // on document update
    // clear list cache
    central.on('article-tag-update', function(tag1, tag2) {
      if (!tag1 && !tag2) return;
      tag1 = tag1 || '';
      tag2 = tag2 || '';

      if (tag1 instanceof Array) tag1 = tag1.join(',');
      if (tag2 instanceof Array) tag2 = tag2.join(',');

      if (tag2) {
        tags = tag1 + ',' + tag2;
      } else {
        tags = tag1;
      }

      tags = tags.ssplit().unique();

      tags.forEach(function(tag) {
        // exists in both
        if (tag1.indexOf(tag) !== -1) {
          if (!tag2 || tag2 && tag2.indexOf(tag) !== -1) return;
        }
        // data cache
        dataset.unstash(['list', 'tag', tag]);
        // html cache
        central.cache.bulk_delete('_-tag-' + tag);
      });
    });
    central.on('article-cate-update', function(cate) {
      if (!cate) return;
      dataset.unstash(['list', 'cate', cate]);
      central.cache.bulk_delete('_-cate-' + cate);
    });
    central.on('article-update', function(sid) {
      if (!sid) return;
      // clear article html cache
      central.cache.bulk_delete('_-article_-' + sid);
    });
  }
};
