//var express = require('express');
//var util = require('util');

module.exports = {
  modules: ['core', 'admin', 'support', 'misc'],
  // before modules loaded
  before: function(app, parentApp) {
    var reqbase = central.reqbase;
    var render_data = {
      // dont't send header automatically
      need_wait: true,
      css: 'library',
      bodyClass: 'page-library',
      sublogo: '<a href="/">法律文库</a>',
      title: '',
      title_suffix: ' - 法律文库 | ' + central.conf.site_name
    };
    // all the pages under '/library'
    app.all('*', reqbase.ft(),
    reqbase.cache(), reqbase.open(render_data));
  },
  // after modules loaded
  after: function(app, parentApp) {
  },
  // after paren app boot
  ending: function(app, parentApp) {
  }
};
