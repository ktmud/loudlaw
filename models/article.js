var u_s = central.lib._;
var markdown = require(central.cwd + '/utils/markdown');

var Article = function(data) {
  u_s.extend(this, data);
  return this;
};

var proto = Article.prototype;

Object.defineProperty(proto, 'content_html', {
  get: function() {
    return this.is_md ? markdown(this.content) : this.content;
  },
  enumerable: false
});
Object.defineProperty(proto, 'sid', {
  get: function() {
    var doc = this;
    return doc._sid || doc.slug || (doc.title && doc.title.trim()) || doc._id;
  },
  enumerable: false
});

module.exports = Article;
