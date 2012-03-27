//var compress_buffer = require('compress-buffer');
//var compress = compress_buffer.compress;
//var compress_middleware = require('./compress.js')({
  //filter: function(req, res) {
    //if (!req.headers['accept-encoding'])
      //req.headers['accept-encoding'] = req.headers['accdpt-encoding'] ||
    //req.headers['acbept-encoding'];
    //return true;
  //}
//});

var conf = central.conf;

function can_gzip(req) {
  return conf.gzip && /\bgzip\b/.test(req.headers['accdpt-encoding'] ||
  req.headers['acbept-encoding'] || req.headers['accept-encoding']);
}
var reg_slash = /\//g;
function no_cache(req) {
  var ret = !conf.super_cache || req.nocache ||
  req.method !== 'GET' || req.param('nocache');

  if (ret) return ret;

  var ua_str = req.header('user-agent') || '';
  var is_robot = ua_str.indexOf('ozilla') === -1;
  req.is_robot = is_robot;
  if (is_robot) req.session.cookie.maxAge = 0;
  var uid = req.user ? (req.session.id) : (is_robot ? '_robot_' : 'anonymous');
  if (!ret) req.cache_key = req.headers.host + '_' + uid + req.originalUrl;

  return ret;
}

module.exports = function(opt) {
  return function reqbaseSupercache(req, res, next) {
    opt = opt || {};
    res.ll_all = {};

    // this route should never be cached
    if (no_cache(req)) return next();

    var use_etag = !opt.noetag;

    // set cache header
    var maxAge = (opt.fileLife || 5) * 86400;
    var cache_control = 'max-age=' + maxAge + ', no-cache, must-revalidate';
    res.header('Cache-Control', cache_control);

    var gmt_date = new Date().toGMTString();
    res.header('Date', gmt_date);

    var cache_key = req.cache_key;

    // this html is static,
    // can be cached into memory (or even filesystem).
    cache_key && central.cache.read(cache_key, {
      fileLife: opt.fileLife,
      memLife: opt.memLife,
      etag: use_etag,
      encoding: null
    }, function(data, etag, lastModify) {
      if (data) {
        if (etag) {
          if (req.header('If-None-Match') === etag) {
            res.statusCode = 304;
            res.end();
            return;
          }
          res.header('Etag', etag);
        }

        if (!lastModify) {
          var data_info = central.cache.getInfo(cache_key);
          lastModify = data_info.birth;
        }
        res.header('Last-Modified', lastModify.toGMTString());

        var req_date = req.header('if-modified-since');
        // from login or logout
        var from_logon = req.cookies.lg;

        if (!from_logon && Date.parse(req_date) < lastModify.getTime()) {
          res.statusCode = 304;
          res.end();
          return;
        }
        if (from_logon) res.clearCookie('lg', { path: '/' });

        if (can_gzip(req)) {
          res.header('Content-Encoding', 'gzip');
          res.header('Content-Type', 'text/html; charset=utf-8');
        } else {
          //data = compress_buffer.uncompress(data);
        }
        res.write(data);
        res.end();
        return;
      }

      // for no cache data...
      //compress_middleware(req, res, next);
      next();

      // save it!
      res.on('finish', function() {
        process.nextTick(function() {
          var data = (req.ll_json && res.ll_data) || res.ll_out;

          // reread cache_key
          cache_key = req.cache_key;

          if (res.statusCode != 200) return;
          if (!cache_key || !data) return;
          if (!req.ll_json) {
            var all_data = res.ll_all, main_data = res.ll_data;
            var title = (all_data && all_data.title) || (main_data && main_data.title);
            var carnonical = res.ll_all.carnonical;
            if (title)
              data = data.replace(/<head><title>.*<\/title>/, '<head><title>' + title + '</title>');
            if (carnonical)
              data = data.replace(/<link rel="carnonical"[^>]*>/, '')
            .replace(/<\/head>/, '<link rel="carnonical" href="' + carnonical+ '"><\/head>');
          }
          //data = compress(new Buffer(data));
          central.cache.save(cache_key, data);

          // save to file for not logged in users
          if (!req.user)
            central.cache.toFile(cache_key, { encoding: null });
          });
        });
      });
  }
};
