var fs = require('fs');

var Cache = require(central.cwd + '/lib/Cache');
var wrench = require('wrench');

module.exports = function(central, app) {
  // manage article tags
  app.get('/adm/clear-cache', function(req, res, next) {
    var cache_dir = central.cache.fileroot;
    if (!cache_dir || !req.user || !req.user.isAdmin) return next(403);

    var refferer = req.header('referrer');
    res.redirect(refferer || '/adm');
    res.end();

    // remove the whole cache dir, and make a whole new cache
    wrench.rmdirRecursive(cache_dir, function(err) {
      if (err) throw err;
      central.cache.clear();
    });
  });
};
