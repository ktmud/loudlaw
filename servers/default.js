var express = require('express');
var util = require('util');

module.exports = {
  vhost: '*',
  modules: [],
  // before parent boot
  before: function(app, parentApp) {
    app.all('*', function(req, res) {
      app.log('warn', '[BAD DOMAIN]: ' + req.header('host'));
      res.redirect(central.conf.site_root + req.url);
    });
  },
  // after parent boot
  after: function(app, parentApp) {
  }
};
