var crypto = require('crypto');
var _ = require('underscore');

Object.defineProperty(Array.prototype, 'unique', {
  get: function() {
    return function() {
      var o = {}, i, l = this.length, r = [];
      for (i = 0; i < l; i++) o[this[i]] = this[i];
      for (i in o) r.push(o[i]);
      return r;
    };
  },
  enumerable: false
});

Object.defineProperty(Array.prototype, 'shuffle', {
  get: function() {
    return function(limit, filt) {
      var array = this.slice();
      var tmp, current, idx, top = array.length;

      if (limit) {
        idx = Math.min(limit, top);
      } else {
        idx = top;
      }

      if (top) while (--idx) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[idx];
        array[idx] = tmp;
      }

      if (filt) {
        var ret = [], i, j = 0;
        while (i < limit && j < top) {
          if (filt(array[j])) {
            ret[i] = array[j];
            i++;
          }
          j++;
        }
        return ret;
      } else {
        return array.slice(0, limit);
      }
    };
  },
  enumerable: false
});

var helpers = {
  md5: function(data, encoding) {
    var hash = crypto.createHash('md5');
    hash.update(data);
    encoding = encoding || 'hex';
    return hash.digest(encoding);
  }
};

helpers._ = _;

['date', 'log', 'text'].forEach(function(item) {
  _.extend(helpers, require('./' + item));
});

module.exports = helpers;
