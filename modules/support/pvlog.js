var mc = central.memcache;

var updated = {
  articles: {}
};

// log page view
module.exports = {
  _dir: __dirname,
  // update options
  set: function(options) {
  },
  sync: function sync(type, fn) {
    var data = [];
    var id;
    for (id in updated[type]) {
      data.push({
        _id: id,
        hits: updated[type][id],
        // last access time
        atime: new Date()
      });
    }
    id && central.datasets[type].bulkUpdate(data, function(err, res) {
      if (err) central.emit('silent-error', err);
      updated[type] = {};
    });
  },
  // add hit of something
  hit: function doLog(type, id, num, fn) {
    if (typeof num == 'function') {
      fn = num;
      num = 0;
    }
    process.nextTick(function() {
      var mc_key = type + '::hits::' + id;
      num = num || 0;
      if (num) {
        updated[type][id] = num++;
        mc.set(mc_key, num);
      } else {
        mc.get(mc_key, function(err, num) {
          updated[type][id] = num++;
          mc.set(mc_key, num);
        });
      }
    });
  },
  init: function(central, app) {
    var self = this;
    setInterval(function() {
      self.sync('articles');
    }, 60 * 60 * 1000);
  }
};
