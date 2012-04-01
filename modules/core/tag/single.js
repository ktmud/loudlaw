var dataset = central.datasets.tags;

function handle_update_tag(req, res, next, isNew) {
  if (!req.user || !req.user.isEditor) return next(403);
  if (req.method === 'POST') return update_tag(req, res, next, isNew);
  if (isNew) return next();

  dataset.fetch(['id', req.params.tag], function(err, doc) {
    if (err) next(err);
    render_tag(res, doc, req.params.subsite);
  });
}

function update_tag(req, res, next, isNew) {
  var info = req.body;
  var for_target = info.for || req.params.subsite;
  for_target = for_target.ssplit();
  var subsite = for_target[0];

  if (info.restore) {
    return restore_tag(info._id, req, res, next);
  }

  info.name = info.name && info.name.trim();
  info._id = info._id && info._id.trim();

  var tag_id = info._id;

  if (!info.name) {
    res.ll_exception = 'tag name required';
    return next();
  }
  if (isNew && !tag_id) {
    res.ll_exception = 'tag id required';
    return next();
  }
  
  var doc = {
    _rev: info._rev,
    for: for_target,
    desc: info.desc,
    deleted: !!(info.delete),
    name: info.name,
    ref: info.ref,
    related: info.related
  };
  doc.mtime = new Date();
  doc.ctime = doc.ctime || doc.mtime;

  dataset.save(['id', tag_id], doc, function(err, ret) {
    if (err) return next(err);
    central.emit('tag-update', tag_id);
    if (isNew) {
      var pre = info.pre;
      if (pre && pre.indexOf('/edit') > -1) {
        var url = pre.replace(/(\?add_tag=.*)?$/, function($1) {
          return $1 ? ($1 + ',' + tag_id) : ('?add_tag=' + tag_id);
        });
        return res.redirect(url);
      }
      return res.redirect(req.originalUrl.replace('s/add', '-' + tag_id + '/edit'));
    } else if (doc.deleted) {
      return res.redirect('/tags');
    } else {
      render_tag(res, ret, subsite);
    }
  });
}

function restore_tag(tag_id, req, res, next) {
  dataset.fetch(['id', tag_id], function(err, doc) {
    if (err) return next(err);
    doc.deleted = false;
    dataset.save(['id', tag_id], doc, function(err, doc) {
      if (err) return next(err);
      central.emit('tag-update', tag_id);
      render_tag(res, doc, req.params.subsite);
    });
  });
}

function render_tag(res, doc, subsite) {
  res.ll_render('admin/tags/update', {
    subsite: subsite,
    title: '编辑标签: ' + doc.name,
    data: doc
  });
}

function new_tag(req, res, next) {
}

exports.add = function(req, res, next) {
  res.ll_render('admin/tags/update', {
    subsite: req.params.subsite,
    title: '新加标签'
  });
  handle_update_tag(req, res, next, true);
};
exports.edit = function(req, res, next) {
  handle_update_tag(req, res, next);
};
exports.restore = restore_tag;
