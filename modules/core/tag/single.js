var dataset = central.datasets.tags;

function update_tag(req, res, next) {
  var isNew = req.isNew;
  var info = req.body;
  var for_target = info.for || req.app.hostname;
  for_target = for_target.ssplit();

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
      res.doc = doc;
      next();
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
      res.doc = doc;
      next();
    });
  });
}

exports.add = function(req, res, next) {
  req.isNew = true;
  next();
};
exports.edit = function(req, res, next) {
  dataset.fetch(['id', req.params.tag], function(err, doc) {
    if (err) next(err);
    res.doc = doc;
    next();
  });
};
exports.update = update_tag;
exports.show = function(req, res, next) {
  var data;
  var doc = res.doc;
  var subsite = res.app.hostname || '';

  if (doc) {
    data = {
      subsite: subsite,
      title: '编辑标签: ' + doc.name,
      data: doc
    };
  } else {
    data = {
      subsite: subsite,
      title: '新加标签'
    };
  }
  res.ll_render('admin/tags/update', data);
}

exports.restore = restore_tag;
