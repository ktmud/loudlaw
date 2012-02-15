var nodemailer = require('nodemailer');
var jade = require('jade');
var fs = require('fs');
var pandoc = require('./pandoc');

if (central.conf.smtp) {
  nodemailer.SMTP = central.conf.smtp;
}

nodemailer.sendmail = '/usr/sbin/sendmail -t -i';

var templates = {};

var tmpl_path = process.cwd() + '/views/emails';
fs.readdir(tmpl_path, function(err, files) {
  files.forEach(function(item, i) {
    var tmp = item.split('.');
    if (tmp.pop() == 'jade') {
      var file = tmpl_path + '/' + item;
      fs.readFile(file, function(err, buffer) {
        if (err) return;
        templates[tmp.join('.')] = jade.compile(buffer.toString('utf-8'));
      });
    }
  });
});

module.exports = {
  send_contact: function(opt, fn) {
    var receiver = opt.receiver || central.conf.admin_email;
    if (!receiver) return fn('no receiver');
    if (!templates['contact']) {
      return fn('template not ready');
    }
    var html = templates['contact'](opt);
    var msg = {
      sender: central.conf.sender_email,
      to: receiver,
      subject: '[请求联系] ' + opt.ip,
      html: html
    };
    pandoc.html2md(html, function(err, md) {
      msg.body = md;
      nodemailer.send_mail(msg, fn);
    });
  },
  send_500: function(opt, fn) {
    var receiver = opt.receiver || central.conf.admin_email;
    if (!receiver) return fn('no receiver');
    if (!templates['500']) {
      return fn('template not ready');
    }
    var html = templates['500'](opt);
    var msg = {
      sender: central.conf.sender_email,
      to: receiver,
      subject: '[Error Report] ' + opt.subject,
      html: html
    };
    pandoc.html2md(html, function(err, md) {
      msg.body = md;
      nodemailer.send_mail(msg, fn);
    });
  },
  send_article_error: function(opt, fn) {
    var receiver = opt.receiver || central.conf.admin_email;
    if (!receiver) return fn('no receiver');
    if (!templates['article-error']) {
      return fn('template not ready');
    }
    var html = templates['article-error'](opt);
    var msg = {
      sender: central.conf.sender_email,
      to: receiver,
      subject: '[文章报错] ' + opt.article_title,
      html: html
    };
    pandoc.html2md(html, function(err, md) {
      msg.body = md;
      nodemailer.send_mail(msg, fn);
    });
  }
};
