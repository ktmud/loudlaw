module.exports = function(central, app, dataset) {
  app.param('article_id', function(req, res, next, operation) {
    var sid = req.params.article_id;

    // get document by sid.
    dataset.fetch(['sid', sid], function(err, doc) {
      if (err == 'not_found' || err == 404) {
        res.statusCode = 404;
        return next();
      } else if (err) {
        res.statusCode = 500;
        return next(err);
      }
      if (!doc) {
        res.statusCode = 404;
        return next();
      }
      res.article_doc = doc;

      next();
    });
  });

  app.param('do', function(req, res, next, operation) {
    // operation doesn't exist
    if (operation && !(operation in available_ations)) {
      res.redirect('/article/' + req.params.article_id);
      return;
    }
    req.isEditor = req.user && req.user.isEditor;

    switch (operation) {
    case 'edit':
      //delete req.cache_key;
      res.tmpl = 'library/single/mods/edit';
      handle_edit(req, res, next);
      return;
    case 'flag':
      handle_flag(req, res, next);
      return;
    case 'comment':
      handle_comment(req, res, next);
      return;
    default:
      next();
    }
  });
};
