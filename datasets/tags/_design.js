module.exports = {
  list: {
    views: {
      'for': {
        map: function(doc) {
          if (doc.deleted) return;

          if (!doc['for']) return;
          var target = doc['for'];
          if (typeof target == 'string') targets = target.split(',');

          for (var i in targets) {
            emit([targets[i]], doc);
          }
        },
        reduce: '_count'
      }
    }
  }
};
