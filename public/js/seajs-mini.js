(function(m, o, d, u, l, a, r) {
  if (m[d]) return;
  function f(n, t) { return function() { r.push(n, arguments); return t; } }
  m[d] = a = { args: (r = []), config: f(0, a), use: f(1, a) };
  m.define = f(2);
  u = o.createElement('script');
  u.id = d + 'node';
  u.src = '#{static("/js/sea.js")}';
  l = o.getElementsByTagName('head')[0];
  l.insertBefore(u, l.firstChild);
})(window, document, 'seajs');
