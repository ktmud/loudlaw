var mc = central.memcache;
var pandoc = central.lib.pandoc;
var Menu = central.lib.Menu;

var _menu = new Menu({
  flag: {
    class: 'red',
    text: '错',
    desc: '报错'
  },
  comment: {
    text: '评',
    desc: '发表看法'
  },
  edit: {
    class: 'light',
    text: '编',
    desc: '编辑'
  }
}, ['flag', 'comment', 'edit']);

var actions = {
  'flag': require('./flag'),
  'edit': require('./edit'),
  'comment': require('./comment')
};


module.exports = function(central, app, dataset) {

  var SITE_NAME = central.conf.site_name;
  var reqbase = central.reqbase;
  u_s = central.lib._;

  var singleUrl = '/article/:article_id/:do?.:format?';

  app.param('article_id', function(req, res, next, sid) {
    // get document by sid.
    dataset.fetch(['id', sid], function(err, doc) {
      if (err === 'not_found' || err === 404) {
        return go_404(res);
      } else if (err) {
        res.statusCode = 500;
        return next(err);
      }
      if (!doc) return go_404(res);

      var real_sid = doc.sid;

      if (!sid && !real_sid) return go_404(res);

      if (sid != real_sid) {
        dataset.unstash(['id', sid]);
        if (doc.title) dataset.stash(['id', real_sid], doc);
        return res.redirect('/article/' + encodeURIComponent(real_sid), 301);
      }

      req.baseUrl = '/article/' + encodeURIComponent(real_sid);

      res.article_doc = doc;
      next();
    });
  });

  app.param('do', function(req, res, next, operation) {
    // operation doesn't exist
    if (operation && !(operation in _menu.items)) {
      return res.redirect('/article/' + req.params.article_id);
    }
    req.isEditor = req.user && req.user.isEditor;

    if (operation in actions) {
      return actions[operation](req, res, next);
    }

    next();
  });

  function go_404(res) {
    res.stausCode = 404;
    res.ll_render('library/single/404');
  }

  function flush_head(req, res, next) {
    var doc = res.article_doc;
    res.tmpl = res.tmpl || 'library/single/mods/show';

    var operation = req.param('do');
    if (operation) {
      req.session.onesalt = Date.now();
    } else if (!req.is_robot) {
    }

    var tmpl_data = {
      pipefy: true,
      desc: '《#{title}》：' + central.helpers.trunc(doc.content, 140, true),
      operation: operation,
      statusCode: res.statusCode,
      carnonical: req.baseUrl,
      baseUrl: req.baseUrl,
      title: doc.title,
      userActions: _menu.export(operation, req),
      doc: doc,
      hits: doc.hits,
      comments: [],
      n_comments: 0,
      add_tag: res.add_tag,
      flag_msg: res.flag_msg,
      flag_detail: req.param('detail'),
      onesalt: req.session.onesalt,
      data: res.action_result || doc
    };

    if (res.ll_txt === 'md') {
      if (doc.is_md) {
        res.ll_txt = doc.content;
      } else {
        pandoc.html2md(doc.content, function(err, txt) {
          res.ll_txt = txt;
          res.ll_render(res.tmpl);
        });
        return;
      }
    }
    res.tmpl_data = tmpl_data;

    // flush head
    res.ll_write('library/single', tmpl_data, next);
  }

  function go_render(req, res, next) {
    var tmpl_data = res.tmpl_data;

    var doc = tmpl_data.doc;
    var operation = tmpl_data.operation;
    var keyword = tmpl_data.keyword = req.param('q');

    var pending = 3;
    function countDown() {
      --pending || next();
    };

    var p_main = u_s.clone(tmpl_data);
    var p_sidebar = u_s.clone(tmpl_data);

    function render_sidebar(mod_conf) {
      mod_conf = mod_conf && JSON.stringify(mod_conf) || '';
      p_sidebar.pagelet = {
        id: 'sidebar',
        js: 'library',
        onload: ['mod1(' + mod_conf + ');']
      };
      res.ll_write('library/single/mods/sidebar', p_sidebar, countDown);
    }

    // 1. update page views
    // 2. render sidebar
    if (req.is_robot) {
      render_sidebar();
    } else if (operation) {
      render_sidebar({ operation: operation });
    } else {
      mc.get('articles::hits::' + doc._id, function(err, num) {
        // update hits cache
        p_sidebar.hits = num || doc.hits;
        render_sidebar();
      });
      // any cached view, which returns 304, will not be counted
      app.modules.support.pvlog.hit('articles', doc._id);
    }

    // 3. render tags
    if (doc.tags && !operation) {
      central.datasets.tags.details(doc.tags, function(err, tags) {
        if (!tags || (typeof tags[0] != 'object')) return countDown();

        tmpl_data.tags = tags;
        tmpl_data.pagelet = {
          id: 'tags',
          depends: ['sidebar']
        };
        res.ll_write('library/single/mods/tags', tmpl_data, countDown);
      });
    } else {
      countDown();
    }

    var pmp = p_main.pagelet = {
      id: 'article'
    };
    if (operation === 'edit') {
      pmp.js = ['library.edit'];
      pmp.onload = ['mod1();'];
    } else {
      pmp.js = ['library'];
      pmp.onload = ['mod1.toc();'];
    }
    // 4. render main content
    res.ll_write(res.tmpl, p_main, countDown);
  }

  app.get(singleUrl, app.rq_ft, app.rq_cache, app.rq_open,
  flush_head, go_render, app.rq_close);

  app.post(singleUrl, app.rq_ft, app.rq_open, flush_head,
  go_render, app.rq_close);

};
