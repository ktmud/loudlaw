var bootstrap = require('./bootstrap.js');

var b = bootstrap.browser;
var log = bootstrap.log;
var app = central.servers.library;

describe('Library'.cyan, function() {
  if (!app) return;

  before(function() {
    b.site = app.uri_root;
  });

  describe('# Home Page #'.yellow, function() {
    before(function(done) {
      b.visit('/', done);
    });
    it('has tags', function() {
      b.queryAll('.tags a').should.not.empty;
    });
    it('has popular articles', function() {
      b.queryAll('.popular-articles').length.should.equal(4);
    });
    it('can search', function(done) {
      b.fill('#inp-q', '宪法').pressButton('.btn-submit', function(e, b) {
        b.location.pathname.should.equal('/search');
        decodeURI(b.location.search).should.equal('?q=宪法');
        done();
      });
    });
  });

  describe('# Cate List Page #'.yellow, function() {
    before(function(done) {
      b.visit('/cate-01', done);
    });
    it('has 12 ordered list items', function() {
      b.queryAll('.article-body ol li').length.should.equal(12);
    });
    it('can goto next page', function(done) {
      b.clickLink('.pagi-next', function(err, b) {
        b.location.pathname.should.equal('/cate-01/p2');
        done();
      });
    });
  });

  describe('# Tags Page #'.yellow, function() {
    before(function(done) {
      b.visit('/tags', done);
    });
    it('has tags', function() {
      b.queryAll('.az-block').length.should.be.above(2);
    });
  });
});

