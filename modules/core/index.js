module.exports = {
  _dir: __dirname,
  init: function(central, app) {
    this.mount('reqbase', 'auth', 'article', 'tag', app);
  }
};
