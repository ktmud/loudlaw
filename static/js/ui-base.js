define(function(require, exports, module) {
  var $ = window.jQuery;

  //var _ = require('lib/underscore');

  $.substitute = function(str, sub, cl) {
    return str.replace(/\{(.+?)\}/g, function($0, $1) {
        return $1 in sub ? sub[$1] : (cl ? '' : $0);
    });
  };

  $.fn.holderLabel = function() {
    var form = this;
    form.find('label.placeholder').each(function(i) {
      var label = $(this);
      var inp = $('#' + label.attr('for')).css('position', 'static');

      function checkLabel() {
        if (inp.val() === '') {
          label.show();
        } else {
          label.hide();
        }
      }
      checkLabel();

      inp.focus(function() {
        label.addClass('inp-active');
        checkLabel();
      }).bind('input keyup', checkLabel).blur(function() {
        label.removeClass('inp-active');
        checkLabel();
      });
    });
    return form;
  };

  var win = $(window);
  $.fn.fixed = function(opt) {
    var self = this;

    if (!self.length) return self;

    opt = opt || {};
    var t;
    var opt_offset = opt.offset || 0;
    var self_offset = self.offset();
    var offset_top = self_offset.top;
    var cls = opt.addClass || '';
    var css_top = parseInt(self.css('top'), 10) || 0;

    win.on('scroll', function() {
      try {
        clearTimeout(t);
      } catch (e) {}
      t = setTimeout(check_pos, 200);
    });

    function check_pos() {
      var scroll_top = win.scrollTop();
      if (scroll_top > self_offset.top) {
        self.stop().hide().addClass(cls).css({
          'top': css_top + (scroll_top - offset_top) + opt_offset
        }).fadeIn();
      } else {
        self.css({ top: '', opacity: '' }).removeClass(cls).fadeIn();
      }
    }

    return self;
  };

  return {
    jquery: $
  };
});
