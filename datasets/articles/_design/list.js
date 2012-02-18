var pinyin = central.istatic('/utils/pinyin.js');

module.exports = {
  views: {
    // find by type, sort by create time
    type: {
      map: function(doc) {
        if (doc.deleted) return;

        var type = doc.type || (doc.isExp ? 'itpt' : 'law');

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);

        emit([type, doc.ctime], { sid: sid, title: title });
      },
      reduce: '_count'
    },
    // find by type, sort by hits
    type_hits: {
      map: function(doc) {
        if (doc.deleted) return;

        var type = doc.type || (doc.isExp ? 'itpt' : 'law');

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);

        emit([type, doc.hits], { sid: sid, title: title });
      },
      reduce: '_count'
    },
    // find by cate, sort by mtime
    cate: {
      map: function(doc) {
        if (doc.deleted) return;

        var cate = doc.cate;
        if (!cate) return;

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);

        emit([cate, doc.mtime], { sid: sid, title: title });
      },
      reduce: '_count'
    },
    // find by cate, sort by hits
    cate_hits: {
      map: function(doc) {
        if (doc.deleted) return;

        var cate = doc.cate;
        if (!cate) return;

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);

        emit([cate, doc.hits], { sid: sid, title: title });
      },
      reduce: '_count'
    },
    // find by cate, sort by title
    cate_title: {
      map: (function(doc) {
        if (doc.deleted) return;

        // !code libpinyin
        var cate = doc.cate;
        if (!cate) return;

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);

        emit([cate, toPinyin(title, '-')], { sid: sid, title: title });
      }).toString().replace('// !code libpinyin', pinyin),
        // count total_rows for each cate
        reduce: '_count'
    },
    // find by tag, sort by modify date
    tag: {
      map: function(doc) {
        if (doc.deleted) return;

        var tags = doc.tags;
        if (typeof tags == 'string') {
          tags = tags.split(/\s*,\s*/);
        }
        if (!tags || !tags.length) return;

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);
        var mtime = doc.mtime;

        for (var i in tags) {
          emit([tags[i], mtime], { sid: sid, title: title });
        }
      },
      // count total_rows for each cate
      reduce: '_count'
    },
    // find by tag, sort by hits
    tag_hits: {
      map: function(doc) {
        if (doc.deleted) return;

        var tags = doc.tags;
        if (typeof tags == 'string') {
          tags = tags.split(/\s*,\s*/);
        }
        if (!tags || !tags.length) return;

        var title = doc.title && doc.title.trim();
        var sid = (doc.slug || title || doc._id);
        var hits = doc.hits;

        for (var i in tags) {
          emit([tags[i], hits], { sid: sid, title: title });
        }
      },
      // count total_rows for each cate
      reduce: '_count'
    },
    // find by tag, sort by title
    tag_title: {
      map: (function(doc) {
        if (doc.deleted) return;

        // !code libpinyin
        var tags = doc.tags;
        if (typeof tags == 'string') {
          tags = tags.split(/\s*,\s*/);
        }
        if (!tags || !tags.length) return;

        var title = doc.title && doc.title.trim();
        var pinyinTitle = toPinyin(title, '-');
        var sid = (doc.slug || title || doc._id);

        for (var i in tags) {
          emit([tags[i], pinyinTitle], { sid: sid, title: title });
        }
      }).toString().replace('// !code libpinyin', pinyin),
        // count total_rows for each cate
        reduce: '_count'
    }
  }
};
