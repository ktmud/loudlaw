var conf = central.conf;
var cwd = central.cwd;
var u_s = central.lib._;
var http = require('http');
var express = require('express');


//var zlib = require('zlib');
//var stream = require('stream');
//var path = require('path');
var fs = require('fs');
var util = require('util');
var exception_msgs = require(cwd + '/conf/exception_msgs.js');

function normalize_err(err) {
  // make all_data.err to string,
  // and err to an real error object
  if (typeof err == 'string') {
    err = new Error();
    err.name = all_data.err;
  } else {
    all_data.err = err.name || err.error;
  }
  // to display friendly error messages
  all_data.err_msg = exception_msgs[all_data.err];

  if (!err.stack)
    Error.captureStackTrace(err, arguments.callee);

  util.log(err.stack);

  return err;
}

function pipefy(str, conf) {
  conf.content = str;
  return '<script>__spipe.register(' + JSON.stringify(conf) + ')</script>';
}

function extend_res() {
  var proto = express.response || http.ServerResponse.prototype;
  proto.ll_write = function(tmpl, data, fn) {
    var res = this;
    fn = fn || function() { };
    data = data || {};
    var statusCode = data.statusCode || res.ll_all.statusCode || 200;
    if (res.ll_json) {
      if (data.data) return res.json(data.data, statusCode);
      return fn();
    }

    for (var key in data) {
      res.ll_all[key] = data[key];
    }

    if (res.ll_txt) {
      var txt = res.ll_txt.toString('utf-8');
      if (!res.headerSent) {
        res.contentType('text');
      }
      if (txt) {
        res.write(txt);
        return res.end();
      }
      return fn();
    }

    res.partial(tmpl, res.ll_all, function(err, ret) {
      if (err) {
        central.emit('silent-error', err);
        return fn(err);
      }
      if (ret) {
        if (!res.ll_out) res.ll_out = ret.indexOf('<html') > -1 ? '' : '<html><body>';
        if (data.pagelet) {
          var ua_str = res.req.header('user-agent') || '';
          if (ua_str.indexOf('ozilla') > -1) ret = pipefy(ret, data.pagelet);
        }
        res.ll_out += ret;
        if (res._need_wait) {
          // if we dont give a statusCode when write,
          // means that you should keep on write in more data
          if (!res.ll_all.statusCode) return fn();
          // here comes the first trunk of data
          if (!res._headerSent) {
            res.statusCode = statusCode;
            res.write(res.ll_out);
            res._need_wait = false;
            return fn();
          }
        }
        res.write(ret);
      }
      fn();
    });
  };
  proto.ll_render = function(tmpl, data, fn) {
    var res = this;
    fn = fn || function() { };
    if (!res.ll_all) {
      res.ll_all = data || {};
    } else if (data) {
      for (var key in data) {
        res.ll_all[key] = data[key];
      }
    }

    var statusCode = res.ll_all.statusCode || (res.statusCode != 200 && res.statusCode) || 200;

    // when request for json,
    // return only main data.
    var mainData = res.ll_data || res.ll_all.data || {};
    if (res.ll_json) return res.json(mainData, statusCode);
    if (res.ll_txt) {
      var txt = res.ll_txt.toString('utf-8');
      if (!res.headerSent) {
        res.contentType('text');
      }
      txt && res.write(txt);
      res.end();
      return;
    }


    // when request for html,
    // requires all data.
    var allData = res.ll_all;
    var title = allData.title || (mainData.title + ' | ' + conf.site_name);
    if (!res._opened) u_s.defaults(allData, {
      data: mainData,
      bodyClass: res.bodyClass,
      title: title
    });

    res.render(tmpl, allData, function(err, ret) {
      if (err) {
        throw err;
        return res.end();
      }
      res.ll_out = ret;
      res.send(ret, statusCode);
    });
    return;
  };
  proto.ll_log = central.utils.applog;
}

/**
* basic methods to handle request
*
* unified entrance and exit.
*/
module.exports = {
  _dir: __dirname,
  // format control
  // filetype
  ft: function(opt) {
    return function reqbase(req, res, next) {
      var fext = req.param('format');

      // should we render main data as json or not?
      res.ll_json = req.xhr || (fext && fext.toLowerCase() == 'json') ||
      (!req.accepts('html') && req.accepts('json'));

      switch (fext) {
        case 'json':
        case '':
          break;
        case 'md':
          res.ll_txt = fext;
          res.contentType('text');
          break;
        case 'pdf':
          res.ll_stream = true;
          res.contentType('application/octet-stream');
          break;
        default:
        var reg = new RegExp('\\.' + fext + '$');
        if (reg.test(req.url)) {
          return res.redirect(req.url.replace(reg, ''));
        }
      }

      res.ll_all = {};
      next();
    }
  },
  compress: require('./compress.js'),
  // super cache
  cache: require('./supercache.js'),
  // [send head first]
  // this is pass as an middleware. it's
  // because it may be run as the very first route pass
  open: function(option) {
    var self = this;
    return function(req, res, next) {
      if (res._opened) return next();
      else res._opened = true;

      if (res.ll_json) return next();

      var opt = option || res.ll_all || {};
      res.charset = 'utf-8';
      res.contentType('html');

      // noting will be written for json format
      var head_tmpl = opt.head_tmpl || '_blocks/flush_head';
      res.ll_all = {
        user: req.user,
        req_url: req.originalUrl,
        //ref_url: req.header('Reffer'),
        ASSETS_ROOT: req.header('ngx_ssl') ? '' : conf.assets_root,
        title: res.title || conf.SITE_NAME,
        bodyClass: res.bodyClass
      };

      // save option data for render
      for (var key in opt) {
        res.ll_all[key] = opt[key];
      }

      if (opt.need_wait) {
        res._need_wait = true;
        return next();
      }

      // send the header
      res.partial(head_tmpl, res.ll_all, function(err, ret) {
        if (err) return next(err);
        res.ll_out = ret;
        res.write(ret);
        next();
      });
    }
  },
  close: function(option) {
    return function(req, res, next) {
      if (res.ll_json || res.ll_txt) return res.end();
      var opt = option || {};

      var foot_tmpl = opt.foot_tmpl || '_blocks/flush_foot';

      var all_data = res.ll_all;

      for (var key in opt) {
        if (!(key in res.ll_all)) res.ll_all[key] = opt[key];
      }

      // global error handling
      if (all_data.err) {
        // don't save cache
        req.cache_key = null;
        var err = normalize_err(all_data.err);

        res.partial('500', all_data, function(err, ret) {
          if (err) return next(err);
          if (ret) res.write(ret);
          next();
        });
      }
      if (opt.nofoot) return res.end();

      res.partial(foot_tmpl, all_data, function(err, ret) {
        if (err) return next(err);
        if (ret) {
          res.ll_out += ret;
          res.write(ret);
        }
        res.end();
      });
    }
  },
  init: function(central, app, mod) {
    central.reqbase = this;

    extend_res();

    central.lazylib.bigpipe = central.utils.uglify(fs.readFileSync(cwd + '/public/js/lib/bigpipe.js', 'utf-8'))

    // render middleware
    app.helpers({
      DEBUG: conf.debug,
      SITE_ROOT: conf.site_root,
      SITE_NAME: conf.site_name,
      trunc: central.helpers.trunc,
      highlight: central.helpers.highlight,
      _: central.lib._,
      GA_ID: conf.ga_id
    });
    app.dynamicHelpers({
      ASSETS_ROOT: function(req) {
        return req.header('ngx_ssl') ? '' : conf.assets_root;
      },
      user: function(req) {
        return req.user;
      },
      req_url: function(req) {
        return req.originalUrl;
      },
      ck: function(req, res) {
        return req.session._csrf;
      },
      ll_exception: function(req, res) {
        var ll_exception = req.ll_exception || res.ll_exception || '';
        if (ll_exception) central.utils.log(req.url + ': ' + ll_exception);
        return ll_exception;
      },
      msg: function(req, res) {
        var ll_exception = req.ll_exception || res.ll_exception;
        return ll_exception && exception_msgs[ll_exception];
      },
      referrer: function(req) {
        return req.header('referrer') || '';
      }
    });
    //app.dynamicHelpers(/page(-|=)/, {
      //pager: function() {
        //return pager(req.params.page);
      //}
    //});
  }
};
