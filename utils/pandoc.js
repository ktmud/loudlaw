// http://nodejs.org/api.html#_child_processes
var spawn = require('child_process').spawn;
var Stream = require('stream').Stream;

function exec(option, input, output) {
  var pandoc = spawn('pandoc', option);
  if (input instanceof Stream) {
    input.pipe(pandoc.stdin);
  } else {
    pandoc.stdin.write(input);
    pandoc.stdin.end();
  }
  if (output instanceof Stream) {
    pandoc.stdout.pipe(output);
  } else {
    var ret = '';
    var err = '';
    pandoc.stdout.on('data', function(data) {
      ret += data;
    });
    pandoc.stderr.on('data', function(data) {
      err += data;
    });
    pandoc.on('exit', function(code) {
      if (code == 0) {
        output(null, ret);
      } else {
        console.log('[pandoc failed] code:' + code);
        console.log(err);
        output({ code: code, msg: err }, ret);
      }
    });
  }
}

module.exports = {
  html2md: function(input, output, opts) {
    var opt = ['-fhtml', '-tmarkdown'];
    if (opts) opt.concat(opts);
    exec(opt, input, output);
  },
  md2html: function(input, output, opts) {
    var opt = ['-fmarkdown', '-thtml'];
    if (opts) opt.concat(opts);
    exec(opt, input, output);
  }
};
