function Pager(baseUrl, current, perpage, total, pretty) {
  this.pretty = pretty;
  this.baseUrl = baseUrl;
  this.cur = parseInt(current, 10) || 1;
  this.perpage = perpage || 20;
  this.total = total;
}

var proto = Pager.prototype;

Object.defineProperty(proto, 'total_page', {
  get: function() {
    return Math.ceil(this.total / this.perpage);
  },
  enumerable: false
});
Object.defineProperty(proto, 'offset', {
  get: function() {
    return this.perpage * (this.cur - 1) + 1;
  },
  enumerable: false
});
Object.defineProperty(proto, 'offend', {
  get: function() {
    return Math.min(this.total, this.perpage * this.cur);
  },
  enumerable: false
});

// get url of given page
proto.url = function(p) {
  var url = this.baseUrl || '';
  if (!p || p == this.cur) return url;
  var new_url = url.replace(/([^\w])p(=?)[0-9]+(([^\w])|$)/, (p == 1 ? '$3' : '$1p$2' + p + '$3'));
  // havn't changed means match fail
  if (new_url == url) {
    // pretty url, append "/p(n)"
    if (this.pretty) {
      var tmp = url.split('?');
      tmp[0] += ((tmp[0].slice(-1) == '/' ? '' : '/') + 'p' + p);
      return tmp.join('?');
    } else {
      new_url = url + (url.indexOf('?') > -1 ? '&' : '?') + ('p=' + p);
    }
  }
  return new_url;
};

// make link of given page
proto.link = function(p, txt, title) {
  if (this.total_page && p <= 0) p += this.total_page;
  title = title || p && '第 ' + p + ' 页';
  txt = txt || p;
  var url = this.url(p);
  return '<a title="' + title + '" href="' + url + '">' + txt + '</a>';
};

proto.prevLink = function(txt) {
  if (this.cur < 2) return '';
  var p = this.cur - 1;
  var url = this.url(p);
  return '<a class="pagi-prev" title="第 ' + p + ' 页" href="' + url + '">' + txt + '</a>';
};
proto.nextLink = function(txt) {
  if (this.cur == this.total_page) return '';
  var p = this.cur + 1;
  var url = this.url(p);
  return '<a class="pagi-next" title="第 ' + p + ' 页" href="' + url + '">' + txt + '</a>';
};

proto.nav = function(len, left_pad, pagi_break, head_tail_format, firstText, lastText) {
  len = len || 5;
  left_pad = left_pad || 2;
  head_tail_format = head_tail_format || '1,1,,1';
  head_tail_format = head_tail_format.split(',');
  var cur = this.cur;
  var left = Math.max(1, cur - left_pad);
  var right = Math.min(this.total_page || Infinity, cur + len - (cur - left));
  var ret = '';
  pagi_break = pagi_break || '<span class="pagi-break">...</span>';
  var i = 1;
  if (left > 1 && head_tail_format[0]) ret += this.link(1, firstText), i++;
  if (left > 2 && head_tail_format[1]) ret += this.link(2), i++;
  if (left > i) ret += pagi_break;
  for (var i = left; i <= right; i++) {
    if (i == cur) {
      ret += '<span class="pagi-cur">' + i + '</span>';
    } else {
      ret += this.link(i);
    }
  }
  var total = this.total_page;
  if (total) {
    var i = 0;
    if (head_tail_format[2]) i++;
    if (head_tail_format[3]) i++;
    if (right + i < total) ret += pagi_break;
    if (right + 1 < total && head_tail_format[2]) ret += this.link(-1, lastText);
    if (right < total && head_tail_format[3]) ret += this.link(0);
  }
  return ret;
};

module.exports = Pager;
