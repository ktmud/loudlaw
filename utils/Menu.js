var default_order = ['manage', 'add'];

var default_items = {
  add: {
    class: 'light rc-1',
    text: '+新加',
    url: 'add',
    desc: '新加条目'
  },
  manage: {
    class: 'norm',
    text: '整理',
    url: 'manage',
    desc: '管理所有'
  },
  edit: {
    class: 'norm',
    text: '整理',
    url: 'edit',
    desc: '编辑条目'
  },
  pipe: {
    name: 'pipe'
  }
};

var item_cancel = {
  name: 'cancel',
  class: 'gray btn-act-x',
  text: '×',
  url: '',
  desc: '取消操作'
};

function Menu(items, order) {
  if (items) this.items = items;
  if (order) this.order = order;

  return this;
}

Menu.prototype.order = default_order;
Menu.prototype.items = default_items;

Menu.prototype.export = function(current, req) {
  var self = this;

  var arr = [];

  self.order.forEach(function(item) {
    if (item == current) {
      arr.push(item_cancel);
      return;
    }
    var ret = self.items[item] || default_items[item];
    if (ret) {
      if ('priv' in ret) {
        if (!req.user || !req.user.is(ret.priv)) return;
      }
      ret.name = 'name' in ret ? ret.name : item;
      arr.push(ret);
    }
  });

  return arr;
};

module.exports = Menu;
