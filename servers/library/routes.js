module.exports = function(central, app, parentApp) {
  app.extendModule(
    'article/homepage', 'article/list',
    'article/single', 'article/search',
    app.modules.core.article
  );
};
