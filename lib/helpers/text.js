// Extend string functions
var reg_comma = /\s*,\s*/;
Object.defineProperty(String.prototype, 'ssplit', {
  get: function() {
    return function(seperator, len) {
      seperator = seperator || reg_comma;
      if (typeof seperator === 'string') {
        seperator = new RegExp('\\s\*' + seperator + '\\s\*');
      }
      return this.split(seperator, len);
    };
  },
  enumerable: false
});

var reg_special = /[-\\\/?!.*+^$\[\]\(\)\{\}\<\>=:|]/ig;
var reg_blank = /\s+/ig;
var reg_log = /_log\(.+?\)/g;
var reg_html = /<.+?>/g;
var reg_nbsp = /&nbsp;/g;

var reg_substi = /#{(.+?)}/g;

module.exports = {
  strip: function strip(str, doCollapse) {
    str = str || '';
    str = str.replace(reg_html, ' ');
    if (doCollapse) {
      str = str.replace(reg_nbsp, ' ');
      str = str.replace(reg_blank, ' ');
    }
    return str;
  },
  trunc: function trunc(str, len, skipHTML) {
    str = str || '';
    len = len || 50;
    if (skipHTML) str = module.exports.strip(str, true);
    if (str.length > len) {
      return str.slice(0, len) + '..';
    }
    return str;
  },
  highlight: function highlight(str, key) {
    try {
      key = key.trim().replace(reg_special, '\\$0');
      key = key.replace(reg_blank, '|');
      str = str.replace(new RegExp('(' + key + ')', 'ig'), '<span class="h">$1</span>');
    } catch (e) {}
    return str;
  },
  substitute: function substitute(str, obj) {
    obj = obj || {};
    str = str.replace(reg_substi, function(m0, m1) {
      return obj[m1] || '';
    });
    return str;
  }
};
