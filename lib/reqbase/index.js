var conf = central.conf;
var cwd = central.cwd;
var u_s = central.lib._;
var express = central.lib.express;

//var zlib = require('zlib');
//var stream = require('stream');
//var path = require('path');
var fs = require('fs');
var util = require('util');
var exception_msgs = central.exception_msgs;

function normalize_err(err) {
  // make all_data.err to string,
  // and err to an real error object
  if (typeof err === 'string') {
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

// extend res
var proto = express.response;
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

  res.locals(res.ll_all);
  res.render(tmpl, function(err, ret) {
    if (err) {
      central.emit('silent-error', err, res.app);
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
  var title = allData.title || (mainData.title ? (mainData.title + ' | ') : '') + conf.site_name;
  if (!res._opened) u_s.defaults(allData, {
    data: mainData,
    bodyClass: res.bodyClass,
    title: title
  });

  res.locals(allData);
  res.render(tmpl, function(err, ret) {
    if (err) {
      central.emit('silent-error', err, res.app);
      if (fn) return fn(500);
      return res.end();
    }
    res.ll_out = ret;
    res.send(statusCode, ret);
  });
  return;
};
proto.ll_log = central.utils.applog;

/**
* basic methods to handle request
*
* unified entrance and exit.
*/
module.exports = {
  compress: require(__dirname + '/compress.js'),
  // super cache
  cache: require(__dirname + '/middleware/cache.js'),

  // filetype // format control
  ft: require(__dirname + '/middleware/filetype.js'),

  // less css finding middleware
  css: require(__dirname + '/middleware/css.js'),

  // [send head first]
  open: require(__dirname + '/middleware/open.js'),

  // [close the request]
  close: require(__dirname + '/middleware/close.js'),

  // error handler
  errorHandler: require(__dirname + '/middleware/errorHandler.js'),

  addHelpers: require(__dirname + '/addHelpers.js')
};
