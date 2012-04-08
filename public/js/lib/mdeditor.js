/**
* an markdown editor helper
* @author: ktmud <jyyjcc@gmail.com>
*/
define(function(require, exports, module) {
  var $ = window.jQuery;

  // leads need to be copied to new line, when press Enter
  // > for blockquote
  // - for unordered list
  // * for unordered list
  var copy_leads = /(?:^|\n)( *(\>|\-|\*) +).*$/;
  var ordered_list = /(?:^|\n)(( *)([0-9]+)(\. +)).*$/;

  function MdEditor(elem) {
    var tagname = elem.tagName.toUpperCase();
    if (tagname == 'INPUT' && elem.type != 'text') return;
    if (tagname != 'TEXTAREA') return;
    this.elem = elem;
    this.init();
  }
  MdEditor.prototype = {
    init: function() {
      var elem = this.elem;
      var node = $(elem);
      var self = this;
      node.bind('keypress', function(e) {
        var val = elem.value;
        if (e.keyCode == 13 && !e.altKey) {
          var slices = self.slices();
          var anterior = slices[1];
          anterior = anterior.replace(copy_leads, function(str, p1, p2) {
            return str + '\n' + p1;
          }).replace(ordered_list, function(str, p1, p2, p3, p4) {
            return str + '\n' + (p2 + (parseInt(p3, 10) + 1) + p4);
          });
          var new_offset = anterior.length;
          if (new_offset !== slices[4]) {
            elem.value = anterior + slices[3];
            self._set(new_offset);
            e.preventDefault();
          }
        }
      });
    },
    // get slices according to current cursor position
    slices: function() {
      var self = this,
      elem = self.elem, val = elem.value,
      offset = self._sel(),
      start = offset.start,
      end = offset.end,
      anterior = val.slice(0, start),
      bd = val.slice(start, end),
      tail = val.slice(end);

      return [val, anterior, bd, tail, start, end];
    },
    _sel: function() {
      var t = this.elem;
      var start, end;
      if (document.selection) {
        t.focus();

        var val = t.value;
        var r = t._saved_range || document.selection.createRange();
        var tr = t.createTextRange();
        var tr2 = tr.duplicate();
        tr2.moveToBookmark(r.getBookmark());
        tr.setEndPoint('EndToStart', tr2);
        if (r == null || tr == null) return val.length;

        //for some reason IE doesn't always count the \n and \r in length
        var text_part = r.text.replace(/[\r\n]/g, '.');
        var text_whole = val.replace(/[\r\n]/g, '.');

        start = text_whole.indexOf(text_part, tr.text.length);
        end = start + text_part.length;
      } else {
        start = t.selectionStart;
        end = t.selectionEnd;
      }
      return { start: start, end: end };
    },
    _set: function(s, z) {
      var t = this.elem;
      if (!z) z = s;
      if (document.selection) {
        var range = t.createTextRange();
        range.moveEnd('character', -t.value.length);
        range.moveEnd('character', z);
        range.moveStart('character', s);
        range.select();
      } else {
        t.setSelectionRange(s, z);
        t.focus();
      }
    }
  };

  $.fn.mdeditor = function() {
    var self = this;
    self._md_editors = [];
    self.each(function(i, item) {
      self._md_editors.push(new MdEditor(item));
    });

    return self;
  };

  exports = MdEditor;
});
