var fs = require('fs');

var log = central.utils.log;

module.exports = function(central, app) {
  // manage article tags
  app.get('/adm/clear-cache', function(req, res, next) {
    var cache_dir = central.cache.fileroot;
    if (!cache_dir || !req.user || !req.user.isAdmin) return next(403);

    var refferer = req.header('referrer');
    res.redirect(refferer || '/adm');

    fs.readdir(cache_dir, function(err, files) {
      files.forEach(function(file) {
        fs.unlink(cache_dir + file);
      });
    });
    central.cache.clear(true);
  });
};
