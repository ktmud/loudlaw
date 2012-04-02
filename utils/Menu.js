var default_orders = ['manage', 'add'];

var default_items = {
  cancel: {
    class: 'gray btn-act-x',
    text: '×',
    url: '',
    desc: '取消操作'
  },
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

function Menu(items, order) {
  items = items || default_items;
  this.items = items;

  if (order) {
    this.order = order;
  } else {
    order = [];
    default_orders.forEach(function(item, i) {
      if (item in items) {
        order.push(item);
      }
    });
    this.order = order;
  }

  return this;
}

Menu.prototype.export = function(current, order) {
  var self = this;

  if (current instanceof Array) {
    order = current;
    current = null;
  }

  order = self.order = order || self.order;

  var arr = [];

  if (current) {
    order.forEach(function(item) {
      if (item == current)  {
        arr.push(default_items.cancel);
        return;
      }
      var ret = self.items[item] || default_items[item];
      ret && (ret.name = 'name' in ret ? ret.name : item);
      ret && arr.push(ret);
    });
  } else {
    order.forEach(function(item) {
      var ret = self.items[item] || default_items[item];
      ret && (ret.name = 'name' in ret ? ret.name : item);
      ret && arr.push(ret);
    });
  }
  return arr;
};

module.exports = Menu;
