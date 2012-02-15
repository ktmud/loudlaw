define(function(require, exports, module) {
  var ui_base = require('ui-base');
  var $ = ui_base.jquery;
  var _ = ui_base.underscore;
  var li_tmpl = '<li class="indent-{tagName}"><a href="#{href}">{text}</a></li>';
  var cont;

  //$('#page-toc').on('click', 'a', function(e) {
    //$(e.delegateTarget).find('a.active').removeClass('active');
    //$(this).addClass('active');
  //});

  function init_toc_events(toc) {
    toc.fixed();

    var bd = $(document.body);
    toc.on('click', '.toggler', function() {
      toc.toggleClass('toc-unfolded');
    }).on('click', 'a', function(e) {
      e.preventDefault();
      scroll_to_href(this);
    });

    var url_frag = window.location.hash;
    var url = window.location.href;
    if (url_frag) {
      var link = $('a').filter(function() {
        if (this.href == url_frag || this.href == url) {
          return true;
        }
      });
      link.parents('.toc').addClass('toc-unfolded');
      scroll_to_href(link[0]);
    }
  }
  function scroll_to_href(link) {
    if (!link) return;
    var href = link.getAttribute('href');
    var t = href.split('#')[1];
    if (!t) return;
    var target = $('#' + t);
    if (target.length) {
      var ttop = target.offset().top;
      $('body').animate({ scrollTop: ttop }, 600,
      function() {
        window.location.hash = t;
      });
    }
  }
  function generate_toc() {
    var par = cont;
    var titles = $('h2', par);

    var len1 = len2 = len3 = titles.length;
    // could have more title
    if (len1 < 15) {
      var tmp = $('h2, h3', par);
      len2 = tmp.length;
      if (len2 < 20) titles = tmp;
    }
    // too less, check for dt
    if (len2 < 3) {
      var tmp = $('h2, h3, dt', par);
      len3 = tmp.length;
      if (len3 < 30) titles = tmp;
    }
    if (titles.length < 2) return;

    var cls = '';
    if (len1 > 0) {
      cls += ' with-h2';
    }
    if (len2 > len1) {
      cls += ' with-h3';
    }

    var toc_list = ['<div id="page-toc" class="toc', cls,
    '"><div title="展开/收起目录" id="toc-toggler" class="toggler"></div><div class="contents"><ol>'];
    titles.each(function(i, item) {
      item.id = item.id || 't_' + i;
      var $item = $(item);
      toc_list.push($.substitute(li_tmpl, {
        tagName: item.tagName.toLowerCase(),
        href: item.id,
        text: $.trim($item.text())
      }));
    });
    toc_list.push('</ol></div></div>');
    init_toc_events($(toc_list.join('')).prependTo('#main-body'));
  }

  function init_toolkit_events() {
    var toolkit = $('#toolkit');
    toolkit.on('click', '.fn-fontsize', function(e) {
      e.preventDefault();
      var size = $(this).data('size');
      cont.css('fontSize', size * 100 + '%');
    }).on('click', '.fn-fontfamily', function(e) {
      e.preventDefault();
      var isSans = cont.hasClass('sans-serif');
      if (isSans) {
        cont.removeClass('sans-serif');
        this.title = '使用平滑的无衬线字体';
        this.innerHTML = '<span class="i">平</a>';
      } else {
        cont.addClass('sans-serif');
        this.title = '使用锐利的衬线字体';
        this.innerHTML = '<span class="i">锐</a>';
      }
    }).on('click', '.toggler', function(e) {
      toolkit.toggleClass('toolkit-box-unfolded');
    }).fixed({
      offset: 40,
      addClass: 'toolkit-box-folded'
    });
  }

  var fns = {
    _init_default: function _init_default() {
      //var form = $('#form-flag').holderLabel();
    },
    _init_flag: function _init_flag() {
      var form = $('#form-flag').holderLabel();
    },
    _init_comment: function _init_comment() {
      var form = $('#form-comment').holderLabel();
    }
  };

  // for sidebar functions
  exports = function(conf) {
    conf = conf || {};
    cont = $('#article-content');
    var operation = conf.operation || 'default';
    var action = '_init_' + operation;
    fns[action] && fns[action](conf);

    init_toolkit_events();

    if (conf.toc) exports.toc();
  };

  var reg_special = /[-\\\/?!.*+^$\[\]\(\)\{\}\<\>=:|]/ig;
  var reg_blank = /\s+/ig;
  exports.highlight = function(key) {
    cont = $('#article-content');
    var html = cont.html();
    cont.html(html);
  };
  exports.toc = function() {
    cont = $('#article-content');
    var toc = $('#page-toc');
    if (toc.length) {
      init_toc_events(toc);
    } else {
      generate_toc();
    }
  }
  return exports;
});
