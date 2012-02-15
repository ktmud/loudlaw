define(function(require, exports, module) {
  var mdeditor = require('lib/mdeditor');

  return function(conf) {
    $('#inp-content').mdeditor();
  };
});
