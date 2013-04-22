var dataset = central.datasets.articles;
var toPinyin = central.lib.pinyin.toPinyin;
var pandoc = central.lib.pandoc;

var reg_badchar = /[^\w]+/g;
// user actions
function slugfy(str) {
  return toPinyin(str, '').replace(reg_badchar, '-').toLowerCase();
}

module.exports = function handle_edit(req, res, next) {
  res.tmpl = 'library/single/mods/edit';

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
      dataset.save(['id', doc.sid], doc, function(err, doc) {
        res.redirect('/' + cate_url);
        central.emit('article-cate-update', doc.cate);
        central.emit('article-tag-update', doc.tags);
        dataset.unstash(['id', doc.sid]);
      });


      // force delete
      //dataset.db.remove(doc._id, doc._rev, function() {
        //central.emit('article-cate-update', doc.cate);
        //central.emit('article-tag-update', doc.tags);
        //dataset.unstash(['id', doc.sid], true);
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
      dataset.unstash(['id', sid]);
      doc.cate && central.emit('article-cate-update', doc.cate);
      doc.tags && central.emit('article-tag-update', doc.tags);
    }

    dataset.save(['id', new_sid], doc, function(err, doc) {
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
      res.redirect('/article/' + encodeURIComponent(doc.sid));
      //res.article_doc = doc;
      //return next();
    });

    return;
  }

  var add_tag = req.param('add_tag');
  if (add_tag) res.add_tag = add_tag;
  next();
}
