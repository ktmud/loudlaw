var bootstrap = require('./bootstrap.js');

var b = bootstrap.browser;
var log = bootstrap.log;

describe('Main'.cyan, function() {
  before(function() {
    b.site = central.conf.site_root;
  });

  describe('# Meta #'.yellow, function() {
    ['about', 'contact', 'contribute'].forEach(function(item) {
      it(item + ' page accessible', function(done) {
        b.visit('/' + item, function(err, b) {
          b.success.should.be.true;
          done();
        });
      });
    });
  });
});
