//var express = require('express');
//var util = require('util');

module.exports = {
  modules: ['core', 'admin'],
  // before modules loaded
  before: function(app, parentApp) {
    var reqbase = central.reqbase;
    // all the pages under '/library'
    app.all('*', reqbase.ft(),
    reqbase.cache(), reqbase.open({
      // dont't send header automatically
      need_wait: true,
      css: 'library',
      bodyClass: 'page-library',
      sublogo: '<a href="/">法律文库</a>',
      title: '法律文库 - 法律法规大全，在线法律图书馆 | ' + central.conf.site_name
    }));
  },
  // after modules loaded
  after: function(app, parentApp) {
  },
  // after paren app boot
  ending: function(app, parentApp) {
  }
};
