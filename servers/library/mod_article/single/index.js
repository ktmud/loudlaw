var u_s;
var pandoc = require(central.cwd + '/utils/pandoc');
var sendmail = require(central.cwd + '/utils/sendmail');
var toPinyin = require(central.cwd + '/utils/pinyin').toPinyin;
var reg_badchar = /[^\w]+/g;

var available_ations = {
  flag: {
    name: 'flag',
    class: 'red',
    text: '错',
    desc: '报错'
  },
  comment: {
    name: 'comment',
    text: '评',
    desc: '发表看法'
  },
  edit: {
    name: 'edit',
    class: 'light',
    text: '编',
    desc: '编辑'
  }
};

var action_cancel = {
    name: 'cancel',
    class: 'gray btn-act-x',
    text: '×',
    url: '',
    desc: '取消操作'
};

// user actions
function get_user_actions(req, res) {
  var operation = req.params.do;
  var all_actions = u_s.clone(available_ations);
  all_actions[operation] = action_cancel;

  var actions = [all_actions.flag, all_actions.comment, all_actions.edit];

  //var u = req.user;
  //if (!u) return actions;

  //if (u.isEditor) {
    //actions.push(all_actions.edit);
  //}
  return actions;
}

function handle_edit(req, res, next) {
  var dataset = module.dataset;
  if (!req.isEditor) {
    res.statusCode = 403;
    next();
    return;
  }
  if (req.method === 'POST') {
    var info = req.body;
    var doc = res.article_doc;
    var err;

    // do convert
    if (info.tomd) {
      if (doc.is_md) return next();
      pandoc.html2md(doc.content, function(err, res) {
        if (err || !res) {
          res.ll_exception = 'convert fail';
        } else {
          doc.is_md = 1;
          doc.content = res;
        }
        next();
      });
      return;
    }
    if (info.tohtml) {
      if (!doc.is_md) return next();
      pandoc.md2html(doc.content, function(err, res) {
        if (err || !res) {
          res.ll_exception = 'convert fail';
        } else {
          doc.is_md = 0;
          doc.content = res;
        }
        next();
      });
      return;
    }

    // do deletion
    if (info.delete) {
      var cate = doc.cate;
      var cate_url = cate ? '/cate-' + cate : '';

      doc.deleted = true;
      dataset.save(['sid', doc.sid], doc, function(err, doc) {
        res.redirect('/library' + cate_url);
        central.emit('article-cate-update', doc.cate);
        central.emit('article-tag-update', doc.tags);
        dataset.unstash(['sid', doc.sid]);
      });


      // force delete
      //dataset.db.remove(doc._id, doc._rev, function() {
        //central.emit('article-cate-update', doc.cate);
        //central.emit('article-tag-update', doc.tags);
        //dataset.unstash(['sid', doc.sid], true);
        //res.redirect('/library' + cate_url);
      //});
      return;
    }

    info.title = info.title.trim();
    info.tags = info.tags.trim();
    info.content = info.content.trim();
    if (!info.title) {
      err = 'title required';
    } else if (!info.content) {
      err = 'content required';
    }
    if (err) {
      res.ll_exception = err;
      return next();
    }

    var now = new Date();
    var sid = doc.sid;
    //doc.ctime = doc.ctime || now;

    doc.mtime = now;
    doc.muser = req.user._id;
    doc.is_md = parseInt(info.is_md) || 0; // is markdown

    if (doc.cate !== info.cate) {
      doc.cate && central.emit('article-cate-update', doc.cate);
      info.cate && central.emit('article-cate-update', info.cate);
      doc.cate = info.cate;
    }
    if (doc.tags !== info.tags) {
      central.emit('article-tag-update', doc.tags, info.tags);
      doc.tags = info.tags;
    }

    doc.title = info.title;
    doc.content = info.content;
    doc.slug = (info.slug !== info.title) && slugfy(info.slug); // url slug

    var new_sid = (info.slug || info.title);
    // prevent 404
    if (info.hang) {
      doc.old_sids = doc.old_sids || {};
      if (sid && new_sid !== sid) {
        doc.old_sids[sid] = 1;
        if (new_sid) {
          delete doc.old_sids[new_sid];
        } else {
          delete doc.old_sids[info.title];
        }
      }
    }

    // delete cache and update list
    if (sid && new_sid !== sid) {
      dataset.unstash(['sid', sid]);
      doc.cate && central.emit('article-cate-update', doc.cate);
      doc.tags && central.emit('article-tag-update', doc.tags);
    }

    dataset.save(['sid', new_sid], doc, function(err, doc) {
      if (err) {
        if (typeof err === 'string') {
          res.ll_exception = err;
          return next();
        } else {
          res.statusCode = 500;
          return next(err);
        }
      }
      central.emit('article-update', sid);
      res.redirect('/library/article/' + encodeURIComponent(doc.sid));
      //res.article_doc = doc;
      //return next();
    });

    return;
  }

  var add_tag = req.param('add_tag');
  if (add_tag) res.add_tag = add_tag;
  next();
}
function handle_flag(req, res, next) {
  if (req.method !== 'POST') return next();

  var detail = req.body.detail || '';
  detail = detail.trim();
  if (!detail) {
    res.ll_exception = 'flag detail required';
    return next();
  }
  if (detail.length < 6) {
    res.ll_exception = 'flag detail too short';
    return next();
  }
  var info = req.body;
  var onesalt = req.session.onesalt;
  if (info.onesalt != onesalt) {
    res.ll_exception = 'bad request';
    return next();
  }
  var last_report = req.session.last_report;
  if (last_report === detail) {
    res.ll_exception = 'flag reported';
    return next();
  }
  req.session.last_report = detail;
  info.userId = req.user && req.user.id;
  info.timestamp = central.utils.timestamp();
  info.article_title = res.article_doc.title;
  info.pre = central.conf.site_root + req.originalUrl.replace('/flag', '');
  info.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  sendmail.send_article_error(info, function(err, success) {
    if (err) {
      res.flag_msg = err;
    }
    if (success) {
      res.flag_msg = 'ok';
      return next();
    }
    return next();
  });
}
function handle_comment(req, res, next) {
  next();
}

function slugfy(str) {
  return toPinyin(str, '').replace(reg_badchar, '-').toLowerCase();
}

module.exports = function(central, app, dataset) {
  module.dataset = dataset;
  module.central = central;

  var SITE_NAME = central.conf.site_name;
  u_s = central.lib._;

  var singleUrl = '/article/:article_id/:do?.:format?';

  app.param('article_id', function(req, res, next, operation) {
    var sid = req.params.article_id;

    // get document by sid.
    dataset.fetch(['sid', sid], function(err, doc) {
      if (err === 'not_found' || err === 404) {
        res.statusCode = 404;
        return next();
      } else if (err) {
        res.statusCode = 500;
        return next(err);
      }
      if (!doc) {
        res.statusCode = 404;
        return next();
      }
      res.article_doc = doc;

      next();
    });
  });

  app.param('do', function(req, res, next, operation) {
    // operation doesn't exist
    if (operation && !(operation in available_ations)) {
      res.redirect('/article/' + req.params.article_id);
      return;
    }
    req.isEditor = req.user && req.user.isEditor;

    switch (operation) {
    case 'edit':
      //delete req.cache_key;
      res.tmpl = 'library/single/mods/edit';
      handle_edit(req, res, next);
      return;
    case 'flag':
      handle_flag(req, res, next);
      return;
    case 'comment':
      handle_comment(req, res, next);
      return;
    default:
      next();
    }
  });

  // show article page by sid
  app.all(singleUrl, function go_render(req, res, next) {
    var doc = res.article_doc;
    res.tmpl = res.tmpl || 'library/single/mods/show';

    if (!doc) {
      res.statusCode = 404;
      res.ll_render('library/single/404');
      return;
    }

    var sid = req.params.article_id;
    var real_sid = doc.sid;
    if (sid != real_sid) {
      dataset.unstash(['sid', sid]);
      if (doc.title) dataset.stash(['sid', real_sid], doc);
      res.redirect('/article/' + encodeURIComponent(real_sid), 301);
      return;
    }

    req.baseUrl = '/article/' + encodeURIComponent(real_sid);

    var operation = req.param('do');
    if (operation) {
      req.session.onesalt = Date.now();
    }

    var tmpl_data = {
      pipefy: true,
      desc: '《#{title}》：' + central.helpers.trunc(doc.content, 140, true),
      operation: operation,
      statusCode: res.statusCode,
      carnonical: req.baseUrl,
      baseUrl: req.baseUrl,
      title: doc.title,
      userActions: get_user_actions(req, res),
      doc: doc,
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
  }, function(req, res, next) {
    var tmpl_data = res.tmpl_data;

    var counter = 3;
    function countDown() {
      counter--;
      if (counter <= 0) next();
    };

    var doc = tmpl_data.doc;
    var operation = tmpl_data.operation;
    var keyword = tmpl_data.keyword = req.param('q');

    var p_main = u_s.clone(tmpl_data);
    var p_sidebar = u_s.clone(tmpl_data);

    var mod_conf = '';
    if (operation) mod_conf = JSON.stringify({ operation: operation });
    p_sidebar.pagelet = {
      id: 'sidebar',
      js: 'library',
      onload: ['mod1(' + mod_conf + ');']
    };
    res.ll_write('library/single/mods/sidebar', p_sidebar, countDown);

    if (doc.tags && !operation) {
      central.datasets.tags.bulk(doc.tags, function(err, tags) {
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
    res.ll_write(res.tmpl, p_main, countDown);
  }, central.reqbase.close());
};
