module.exports = {
  list: {
    views: {
      'for': {
        map: function(doc) {
          if (doc.deleted) return;

          if (!doc['for']) return;
          var target = doc['for'];
          if (target.indexOf(',') > 0) {
            var targets = target.split(',');
            for (var i in targets) {
              emit([targets[i]], doc);
            }
          } else {
            emit([target], doc);
          }
        },
        reduce: '_count'
      }
    }
  }
};
