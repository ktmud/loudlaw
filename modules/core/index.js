module.exports = {
  _dir: __dirname,
  init: function(central, app) {
    this.mount('auth', 'article', 'tag', 'exception', app);
  }
};
