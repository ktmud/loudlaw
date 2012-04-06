var bootstrap = require('./bootstrap.js');

var browser = bootstrap.browser;
var log = bootstrap.log;
var app = central.servers.library;

var root = app.uri_root;

describe('Library', function() {
  var b = browser;

  if (!app) return;

  describe('# Home Page #'.yellow, function() {
    before(function(done) {
      b.visit(root + '/', function(e, b) {
        if (e) throw e;
        b.wait(done);
      });
    });
    it('has tags', function() {
      b.queryAll('.tags a').should.not.empty;
    });
    it('has popular articles', function() {
      b.queryAll('.popular-articles').length.should.equal(4);
    });
    it('can search', function(done) {
      b.fill('#inp-q', '宪法').pressButton('.btn-submit', function(e, b) {
        if (e) { throw e; return e; }
        b.location.pathname.should.equal('/search');
        decodeURI(b.location.search).should.equal('?q=宪法');
        done();
      });
    });
  });

  describe('# Cate List Page #'.yellow, function() {
    before(function(done) {
      b.visit(root + '/cate-01', function(e, b) {
        if (e) log(e);
        b.wait(done);
      });
    });
    it('has 12 ordered list items', function() {
      b.queryAll('.article-body ol li').length.should.equal(12);
    });
    it('can goto next page', function(done) {
      b.clickLink('.pagi-next', function(err, b) {
        b.wait(function() {
          b.location.pathname.should.equal('/cate-01/p2');
          done();
        });
      });
    });
  });

  describe('# Tags Page #'.yellow, function() {
    before(function(done) {
      b.visit(root + '/tags', function(err, b) {
        b.wait(done);
      });
    });
    it('has tags', function() {
      b.queryAll('.az-block').length.should.be.above(2);
    });
    //it('can unfold toc', function(done) {
      //b.fire('click', b.query('#toc-toggler'), function(err) {
        //b.query('#page-toc').className.should.equal('toc toc-unfolded');
        //done();
      //});
    //});
  });
});

