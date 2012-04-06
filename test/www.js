var bootstrap = require('./bootstrap.js');

var browser = bootstrap.browser;
var log = bootstrap.log;

describe('Main', function() {
  var b = browser;

  browser.site = central.conf.site_root;

  describe('# Login #'.yellow, function() {
    before(function(done) {
      b.visit(central.servers.library.uri_root + '/tags', done);
    });
    beforeEach(function(done) {
      b.visit('/login', function(e, b, st) {
        b.wait(done);
      });
    });

    it('can login with username / should goto referrer page', function(done) {
      b.fill('uid', 'hello').fill('password', 'hello')
      .pressButton('.btn-submit', function(err, b, st) {
        b.success.should.be.true;
        b.location.pathname.should.equal('/tags');
        done();
      });
    });

    it('can login with email', function(done) {
      b.fill('uid', 'hello').fill('password', 'hello')
      .pressButton('.btn-submit', function(err, b, st) {
        b.success.should.be.true;
        done();
      });
    });

    it('when user not exist', function(done) {
      b.fill('uid', 'cedaaagag').fill('password', 'aaa')
      .pressButton('.btn-submit', function(err, b, st) {
        b.success.should.be.true;
        b.html().should.include('用户不存在');
        done();
      });
    });

  });

  describe('# Logout #'.yellow, function() {
    // login first
    beforeEach(function(done) {
      b.visit('/login', function() {
        b.fill('uid', 'hello').fill('password', 'hello')
        .pressButton('.btn-submit', function(err, b, st) {
          b.wait(done);
        });
      });
    });

    it('redirects to refferer page', function(done) {
      var library_root = central.servers.library.uri_root + '/tags';
      b.visit(library_root, function(err, b) {
        b.clickLink('退出', function(err, b) {
          b.location.pathname.should.equal('/tags');
          done();
        });
      });
    });
  });
});
