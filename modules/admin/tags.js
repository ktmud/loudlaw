module.exports = function(central, app) {
  var dataset = require(central.cwd + '/datasets/tags');
  // manage article tags
  app.get('/adm/tags', function(req, res, next) {
    next();
  });
};
