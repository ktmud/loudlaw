var dataset, Pager;
var reg_comma = /\s*,\s*/g;

var dataset = central.datasets.tags;
var Pager = central.lib.Pager;

var action_cancel = {
  name: 'cancel',
  class: 'gray btn-act-x',
  text: '×',
  url: '',
  desc: '取消操作'
};

var action_add = {
  name: 'add',
  class: 'light rc-1',
  text: '+新加',
  url: 'add',
  desc: '添加标签'
};
var action_manage = {
  name: 'manage',
  class: 'norm',
  text: '整理',
  url: 'manage',
  desc: '管理所有标签'
};


function handle_update_tag(req, res, next, isNew) {
  if (!req.user || !req.user.isEditor) return next(403);
  if (req.method == 'POST') return update_tag(req, res, next, isNew);
  if (isNew) return next();

  dataset.fetch(['id', req.params.tag], function(err, doc) {
    if (err) next(err);
    render_tag(res, doc, req.params.subsite);
  });
}
function update_tag(req, res, next, isNew) {
  var info = req.body;
  var for_target = info.for || req.params.subsite;
  for_target = for_target.replace(reg_comma, ',');
  var subsite = for_target.split(',')[0];

  if (info.restore) {
    return restore_tag(info._id, req, res, next);
  }

  info.name = info.name.trim();
  info._id = info._id.trim();

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

function show_tags(req, res, next) {
  var params = req.params;
  var subsite = req.params.subsite;
  var sort = params[2] || 'default';
  var page = parseInt(params[3]) || 1;
  var perpage = parseInt(req.param('perpage')) || 500;

  var cache_key = ['list', 'for', subsite, sort, page, perpage];
  dataset.fetch(cache_key, function(err, data) {
    if (err) return next(err);

    var total = data.total;

    var alphabetical = {};

    data.list.forEach(function(item) {
      var az = item._id[0].toUpperCase();
      var entries = alphabetical[az] || (alphabetical[az] = []);
      entries.push(item);
    });

    var baseUrl = '/tags';
    res.ll_render(subsite + '/tags', {
      subsite: subsite,
      action: req.params.act,
      userActions: res.userActions,
      baseUrl: baseUrl,
      carnonical: baseUrl + '/by-' + sort + '/p' + page,
      total: total,
      page: page,
      pager: new Pager(req.originalUrl, page, perpage, total, true),
      data: alphabetical
    });
  });
}

function add_user_action(req, res, next) {
  var isEditor = req.user && req.user.isEditor;
  if (req.params.act && !isEditor) {
    next(403);
    return true;
  }
  if (isEditor) {
    res.userActions = [];
    if (req.params.act == 'manage') {
      res.userActions.push(action_cancel);
    } else {
      res.userActions.push(action_manage);
    }
    if (req.params.act == 'add') {
      res.userActions.push(action_cancel);
    } else {
      res.userActions.push(action_add);
    }
  }
}

module.exports = {
  _dir: __dirname,
  dataset: central.datasets.tags,
  init: function(central, app) {
    var reg_lib_tags = /^\/tags(?:(?:\/(add|manage))|(?:\/by-([^\/]+))?(?:\/p([0-9]+))?)(?:\.(json|xml|rss))?$/;

    // list all the tags
    app.all(reg_lib_tags, function(req, res, next) {
      var act = req.params.act = req.params[1];
      req.params.subsite = app.hostname || '';

      if (add_user_action(req, res, next)) return;

      switch (act) {
      case 'add':
        return handle_update_tag(req, res, next, true);
      default:
        return show_tags(req, res, next);
      }
    }, function(req, res, next) {
      var act = req.params.act;
      if (act == 'add') {
        res.ll_render('admin/tags/update', {
          subsite: req.params.subsite,
          title: '新加标签'
        });
        return;
      }
      next();
    });

    app.all('/tag-:tag/:act', function(req, res, next) {
      var act = req.params.act;
      switch (act) {
      case 'edit':
        handle_update_tag(req, res, next);
        break;
      case '':
        next();
        break;
      default:
        next(404);
      }
    });

    // delete cache when the tag is updated
    central.on('tag-update', function(tag) {
      central.cache.bulk_delete(['tags', 'list'].join(central.conf.cache.keysplitter));
    });

    app.get('/j/tag-suggest/:q', function(req, res, next) {
      var q = req.params.q;
      res.json(ret);
    });
  }
};
