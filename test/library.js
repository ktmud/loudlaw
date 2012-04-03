var bootstrap = require('./bootstrap.js');

var browser = bootstrap.browser;


var app = central.servers.library;

app && (browser.site = app.uri_root);

describe('Library', function() {
  describe('# Home Page', function() {
    var b;
    before(function(done) {
      browser.visit('/', function(e, brower) {
        if (e) throw e;
        b = browser;
        browser.wait(done);
      });
    });
    it('has tags', function() {
      b.queryAll('.tags a').should.not.empty;
    });
    it('can search', function() {
      b.pressButton('.btn-submit', function() {
        console.log(arguments);
      });
    });
  });
});

