module.exports = function(central, app, parentApp) {
  var reqbase = central.reqbase;

  // data for template rendering
  app.ll_all = {
    // dont't send header automatically
    need_wait: true,
    css: 'library',
    bodyClass: 'page-library',
    sublogo: '<a href="/">法律文库</a>',
    title: '',
    title_suffix: ' - 法律文库 | ' + central.conf.site_name
  };

  // request middlewares
  app.rq_ft = reqbase.ft();
  app.rq_cache = reqbase.cache();
  app.rq_open = reqbase.open(app.ll_all);
  app.rq_close = reqbase.close();

  // all the pages under '/library'
  //app.all('*', reqbase.ft(),
  //reqbase.cache(), reqbase.open(render_data));

  app.extendModule(
    'article/homepage', 'article/list',
    'article/single', 'article/search',
    app.modules.core.article
  );
};
