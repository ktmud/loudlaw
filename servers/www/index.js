module.exports = {
  vhost: 'www',
  modules: ['core', 'admin', 'zzzz'],
  // before parent boot
  before: function(app, parentApp) {
  },
  // after parent boot
  after: function(app, parentApp) {
  }
};
