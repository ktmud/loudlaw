var dataset = central.datasets.tags;
var Menu = central.lib.Menu;

// default menu with `mangage` and `add`
var admin_menu = new Menu();

function add_user_action(req, res, next) {
  var app = req.app;
  var act = req.params.act = req.params[0];
  req.params.subsite = app.hostname || '';

  var isEditor = req.user && req.user.isEditor;

  if (isEditor) {
    res.userActions = admin_menu.export(act);
  } else if (act) {
    return next(403);
  }
  next();
}

var all = require('./all');
var single = require('./single');

module.exports = {
  _dir: __dirname,
  dataset: central.datasets.tags,
  init: function(central, app) {
    var reg_tags_uri = /^\/tags(?:(?:\/(add|manage))|(?:\/by-([^\/]+))?(?:\/p([0-9]+))?)(?:\.(json|xml|rss))?$/;

    var mod_auth = app.modules.core.auth;

    // list all the tags
    app.get(reg_tags_uri, add_user_action, function(req, res, next) {
      switch (req.params.act) {
      case 'add':
        return single.add(req, res, next);
      default:
        // show all tags
        return all.tags(req, res, next);
      }
    }, single.show);

    app.get('/tag-:tag/:act', mod_auth.restrict(), function(req, res, next) {
      var act = req.params.act;
      switch (act) {
      case 'edit':
        single.edit(req, res, next);
        break;
      case '':
        // go to the list page
        next('route');
        break;
      default:
        next(404);
      }
    }, single.show);

    app.post('/tags/add', mod_auth.restrict(), single.add, single.update, single.show);
    // single tag edit page (should we fetch the doc first? I don't thins so..)
    app.post('/tag-:tag/:act', mod_auth.restrict(), single.update, single.show);

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
