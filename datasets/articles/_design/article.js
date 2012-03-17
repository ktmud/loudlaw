module.exports = {
  updates: {
    inplace: function(doc, req) {
      if (req.form._id) {
        arg = req.form;
      } else {
        arg = req.query;
      }
      // update doc
      if (doc) {
        doc.mtime = doc.atime = new Date();
        var props = arg.props;
        for (prop in props) {
          if (props.hasOwnProperty(prop)) {
            doc[prop] = props[prop];
          }
        }
        ret = { r: 0, msg: 'update success' };
      } else {
        ret = { error: 'not_found', msg: 'there is no such doc' };
      }

      return [doc, JSON.stringify(ret)];
    }
  },
  views: {
    sid: {
      map: function(doc) {
        if (doc.deleted) return;

        var title = doc.title && doc.title.trim();
        var slug = doc.slug;
        var sid = slug || title || doc._id;
        doc_s = { _sid: sid };
        if (slug) {
          emit(slug, doc);
          emit(title, doc_s);
          emit(doc._id, doc_s);
        } else if (title) {
          emit(title, doc);
          emit(doc._id, doc_s);
        } else {
          emit(doc._id, doc);
        }
        if (typeof doc.old_sids === 'object') {
          for (key in doc.old_sids) {
            if (key != title && key != slug && key != doc._id)
            emit(key, doc_s);
          }
        }
      }
    }
  },
  fulltext: {
    all_fields: {
      index: function(doc) {
        if (doc.deleted) return null;
        if (!doc.content) return null;
        if (!doc.title) return null;

        var ret = new Document();
        var title = doc.title && doc.title.trim();
        var slug = doc.slug;
        var sid = slug || title || doc._id;

        if (slug) ret.add(slug, { boost: 3 });
        if (doc.tags) ret.add(doc.tags, { boost: 3 });
        if (doc.keywords) ret.add(doc.keywords, { boost: 4 });
        if (doc.type === 'itpt' || doc.isExp) ret.add('司法解释', { boost: 5 });
        ret.add(doc.title, { boost: 4 });
        if (doc.content && doc.content.length > 20) {
          ret.add(doc.content);
        } else {
          ret.add(doc.content, { boost: 0.6 });
        }
        ret.add(doc.title, { field: 'title', store: 'yes' });

        function validated(type, val) {
          switch (type) {
            case 'date':
              if (val instanceof Date) return val;
              if (typeof val === 'string') val = Date.parse(val);
              if (typeof val === 'number') return new Date(val);
              break;
            case 'float':
              return parseFloat(val);
            case 'int':
            case 'long':
            case 'double':
              return parseInt(val);
            default:
              return val;
          }
        }

        function add_field() {
          var args = Array.prototype.slice.call(arguments);
          var opt, field;
          if (typeof args[args.length - 1] === 'string') {
            opt = {};
          } else {
            opt = args.pop();
          }
          for (var i in args) {
            field = opt.field = args[i];
            val = doc[field];
            if (opt.type) val = val && validated(opt.type, val);
            if (val) ret.add(val, opt);
          }
        }
        // the dates
        add_field('publish_date', 'lapse_date', 'effect_date', 'ctime', 'mtime', { index: 'not_analyzed', type: 'date' });

        ret.add(sid, { field: 'sid', store: 'yes' });

        return ret;
      },
      analyzer: 'ik'
    }
  }
}
