//var static_send = require('express').static.send;

module.exports = {
  init: function(central, app, mod) {
    var pandoc = require(central.cwd + '/utils/pandoc');
    var sendmail = require(central.cwd + '/utils/sendmail');
    app.all('/misc/email/:action', function(req, res, next) {
      var act = req.params.action;
      var realIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      var pre = req.header('referrer');

      //if (req.param('onesalt') != req.session.onesalt) return next(403);

      if (!act || !(('send_' + act) in sendmail)) return next(404);

      sendmail['send_' + act]({
        userId: req.user && req.user.id,
        subject: req.param('subject'),
        timestamp: req.param('timestamp'),
        comments: req.param('comments'),
        pre: pre,
        ip: realIP
      }, function(error, success) {
        //res.write(success);
        //res.end();
        var msg = success ? '发送成功!' : '发送失败!';
        delete req.session.onesalt;
        res.ll_render('meta/msg', {
          title: '发送成功',
          data: { r: success ? 0 : 1},
          pre: pre,
          showBack: true,
          showToHome: true,
          words: '<h1>' + msg + '</h1>'
        });
      });
    });
    app.all('/misc/html2md', function(req, res, next) {
      var input = req.param('html');
      if (!input) {
        return res.json({ r: 1, msg: 'input required' });
      }
      pandoc.html2md(input, function(err, result) {
        if (err) {
          ret = {
            r: err.code || 1,
            msg: err.msg || 'failed to convert'
          };
        } else {
          ret = {
            r: 0,
            md: result
          };
        }
        res.json(ret);
      });
    });
    app.get('/misc/responsive', function(req, res, next) {
      var url = req.param('url');
      if (!url) return next();
      res.ll_render('utils/responsive_test', {
        url: url,
        layout: false
      });
    });

    var fav_opt = {
      root: central.cwd + '/public',
      getOnly: true,
      path: '/favicon.ico'
    };
    //app.all('/favicon.ico', function(req, res, next) {
      //req.cache_key = null;
      //res._headers['content-type'] = 'image/x-icon';
      //static_send(req, res, next, fav_opt);
    //});
  }
};
