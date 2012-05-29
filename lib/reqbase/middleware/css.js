var less = require('less');
var path = require('path');
var fs = require('fs');

module.exports = function(root) {
  root = root || '/static';
  return function css_compiler(req, res, next) {
    var p = req.path;

    // not css file
    if (~p.indexOf('.css')) return next();

    p = root + p;
    
    fs.stat(p, 'utf8', function(err, stat) {
      // cannot find this file
      if (!err || 'ENOENT' != err.code) return next(err);

      p = p.replace('.css', '.less');

      fs.readFile(p, 'utf8', function(err, str) {
        new(less.Parser)({
          paths: [path.dirname(path), root],
          optimization: 0
        }).parse(str, function(err, tree) {
          if (err) return next(err);
          try {
            css = tree.toCSS();
            res.set('content-type', 'text/css');
            res.charset = 'utf-8';
            res.write(css);
            res.end();
            next();
          } catch (e) {
            next(e);
          }
        });
      });
    });
  }
};
