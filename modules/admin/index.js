var action_cancel = {
  name: 'cancel',
  class: 'gray btn-act-x',
  text: '×',
  url: '',
  desc: '取消操作'
};

var action_clear = {
  name: 'clear',
  class: 'gray',
  text: '清缓存',
  url: 'adm/clear-cache',
  desc: '删除所有网站缓存'
};

var action_admin = {
  name: 'admin',
  class: 'gray',
  text: '管理',
  url: 'adm',
  desc: '管理网站配置'
};

var action_articles = {
  name: 'articles',
  class: 'gray',
  text: '文章',
  url: 'adm/articles',
  submenu: [
  ],
  desc: '查看所有文章'
};

var action_settings = {
  name: 'settings',
  text: '设置',
  url: 'adm/settings',
  submenu: [
  ],
  desc: '网站参数设置'
};


var action_comments = {
  name: 'comments',
  class: 'gray',
  text: '评论',
  url: 'adm/comments',
  desc: '管理所有评论'
};

var action_users = {
  name: 'users',
  class: 'gray',
  text: '用户',
  url: 'adm/users',
  desc: '管理用户'
};


var editorMenus = [action_admin];
var adminMenus = [action_clear].concat(editorMenus);

function init(central, app) {
  var mod_auth = app.modules.core.auth;
  var reqbase = central.reqbase;

  // all the pages under '/admin'
  app.all(/^\/adm/, reqbase.ft(), mod_auth.restrict({
    admin: true
  }), reqbase.open({
    layout: 'admin/layout',
    need_wait: true,
    css: 'admin',
    sublogo: '<a href="/adm">管理维护</a>',
    title: '管理维护'
  }), function(req, res, next) {
    var u = req.user;
    var menu = [];
    if (u.isAdmin) {
      menu = [
        action_articles,
        action_comments,
        action_users,
        action_settings
      ];
    }
    res.ll_all.currentAction = req.url.split('/').slice(2, 4);
    res.ll_all.adminMenu = menu;
    next();
  });

  app.locals.use(function(req, res) {
    var u = req.user;
    if (!u) return;
    if (u.isAdmin) {
      res.locals.headerMenu = adminMenus;
    } else if (u.isEditor) {
      res.locals.headerMenu = editorMenus;
    }
  });

  ['articles', 'tags', 'misc'].forEach(function(mod) {
    require('./' + mod).call(this, central, app);
  });
}

module.exports = {
  _dir: __dirname,
  init: init
};
