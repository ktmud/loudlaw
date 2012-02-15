module.exports = function(central, app, parentApp) {
  var reqbase = central.reqbase;

  // all the pages under '/library'
  app.all('/:path_1?/:path_2?/:path_3?/:path_4?/:path_5?.:format?', reqbase.ft(),
  reqbase.cache(), reqbase.open({
    // dont't send header automatically
    need_wait: true,
    css: 'library',
    bodyClass: 'page-library',
    sublogo: '<a href="/">法律文库</a>',
    title: '法律文库 - 法律法规大全，在线法律图书馆 | ' + central.conf.site_name
  }));

  app.extendModule(
    'article/homepage', 'article/list',
    'article/single', 'article/search',
    app.modules.core.article
  );
};
