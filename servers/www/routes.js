module.exports = function(central, app, parentApp) {
  var reqbase = central.reqbase;
  var u_s = central.lib._;

  var galleryImages = [
    '/img/app-screen-1.jpg'
  ];

  // home page
  app.get('/', reqbase.cache(), function(req, res, next) {
    // data for json
    res.ll_data = {
      name: '大声看法',
      url: 'www.dakanfa.com',
      desc: '在线研习法律的最佳场所'
    };

    res.ll_render('index', {
      layout: '_layouts/nohead',
      css: 'index',
      bodyClass: 'page-index',
      title: '大声看法 - 让法律因互联网而有趣',
      galleryImages: galleryImages
    });
  });

  var titles = {
    contribute: '参与进来',
    contact: '联系方式',
    about: '关于我们'
  };

  // all page ends with slash, remove the slash
  app.all(/.\/$/, function(req, res, next) {
    var tmp = req.url.split('?');
    tmp[0] = tmp[0].replace(/\/$/, '');
    res.redirect(tmp.join('?'), 301);
  });

  app.get(/^\/(contribute|about|contact)$/, reqbase.cache(), function(req, res, next) {
    var pname = req.params[0];
    res.ll_render('meta/' + pname, {
      title: titles[pname] + ' | ' + central.conf.site_name,
      onesalt: req.session.onesalt
    });
  });

  // 404 page
  app.all('/library*', function(req, res, next) {
    var host = req.header('host');
    var tmp = host.split(':');
    var libraryServer = central.servers.library;
    if (libraryServer.port) tmp[1] = libraryServer.port;
    host = tmp.join(':');
    host = host.replace(/^(www\.)?/, libraryServer.hostname + '.');
    res.redirect('http://' + host + req.url.replace('/library', ''), 301);
  });

  // 404 page
  app.all('/*', function(req, res, next) {
    res.ll_render('not-ready', {
      data: { r: 404, msg: 'not_found' },
      title: '抱歉! 我们还没准备好呢... ',
      bodyClass: 'page-notready',
      statusCode: 404
    });
  });
};
