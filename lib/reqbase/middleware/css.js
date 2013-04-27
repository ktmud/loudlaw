var less = require('less');
var path = require('path');
var fs = require('fs');

module.exports = function(root) {
  root = root || '/static';
  return function css_compiler(req, res, next) {
    var p = '/css' + req.path;

    // not css file
    if (p.indexOf('.css') === -1) return next();

    p = root + p;
    
    fs.stat(p, function(err, stat) {
      if (!err || 'ENOENT' != err.code) return next(err);

      // cannot find this file
      var lessFile = p.replace('.css', '.less'), str;

      try {
        str = fs.readFileSync(lessFile);
      } catch (e) {
        if ('ENOENT' === err.code) return next();
        return next(e);
      }

      str = str && str.toString() || '';

      new(less.Parser)({
        paths: [path.dirname(p), root],
        optimization: 0
      }).parse(str, function(err, tree) {
        if (err) return next(err);
        try {
          css = tree.toCSS();
          fs.writeFileSync(p, css);
          req.app.log('Saved css file: ' + p);
          next();
        } catch (e) {
          next(e);
        }
      });
    });
  }
};
