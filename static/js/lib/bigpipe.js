// this script should be inline
(function(win, doc, seajs) {
  var $ = function(id) {
    if (typeof id == 'string') return document.getElementById(id);
    return id;
  };
  $.uuid = 0;

  /**
  * @param {array} funs 需要执行的函数，一个文本数组.
  */
  var _invoke = function(funs) {
    if (funs) return function() {
      for (var i = 0, len = funs.length; i < len; i++) try {
        (new Function('mod1,mod2,mod3', funs[i])).apply(this, arguments);
      } catch (a) {}
    }
  };

  /**
  * 只有在开发模式下，才输出调试信息
  */
  var _log = function() {
    var console = window.console;
    if (window._DEV_ && console) console.log.apply(console, arguments);
  };

  var euid = function(prefix, suffix) {
    return (prefix || '') + ($.uuid++) + (suffix || '');
  };

  var EVENT_INIT = 'pipe_init';

  /**
  * 类似Facebook之 pagelet 的实现
  *
  *  = 原理与逻辑 =
  *
  *  通过 register  方法注册 pagelet 区块
  *  如果注册的 pagelet 的 config.wait 不为 true,
  *  则一得到区块内容就渲染
  *  否则，等到 DOMReady 时才渲染
  *
  *  最大的用处当然是边加载边渲染，但页面已经完全载入的时候
  *  仍然可以调用 register 方法注册新区块
  *
  *  如果 pagelet_id 在文档中找不到，会新建一个并插入默认区域
  *  插入必然是在DOMReady时执行，并且一插入即渲染
  *
  *  模块载入时会新建一个实例(window.__spipe)，并在DOMReady时运行
  *  可以新建多个 SPipe 实例，方便利用不同的默认区域和管理优先级
  *
  *  pagelet 对js css 的依赖，通过 config.assets 指定
  *    (这个参数名义上是assets，其实是一个KISSY.add的模块名)
  *
  *  pagelet 相对页面其他元素的依赖，通过 config.depends 实现
  *
  * @param {string|node} defaultArea 默认把未指定ID或找不到ID的元素
  *                      所要插入的区域.
  */
  function SPipe(defaultArea) {
    var self = this;

    self._cbs = [];
    self.hasRan = false;
    self.pagelets = {};
    self.defaultArea = defaultArea || 'main-body';

    return self;
  }

  SPipe.prototype = {
    /**
    *  注册pagelet
    *
    *  流程：
    *    检查pagelet依赖 -> 检查assets依赖 -> 渲染
    *
    * @param {object} config          必须的配置信息.
    * @param {string} config.id       pagelet容器的id.
    * @param {string} config.content  容器内的HTML.
    * @param {array}  config.onload   HTML渲染后要执行的JS代码.
    * @param {string} config.wait  是否立即渲染, 否则等待DOMReady.
    * @param {string} config.css      渲染前需要依赖的CSS/JS(一般是CSS),
    *                                 通过KISSY模块指定, 可用逗号分隔.
    * @param {string} config.js       执行回调前需要依赖的CSS/JS(一般是JS),
    *                                 通过KISSY模块指定, 可用逗号分隔.
    * @param {array}  config.depends  前置区块的的元素ID, 当前模块渲染前,
    *                                 这个元素必须在文档中存在.
    **/
    register: function(config) {
      //SPipe实例
      var self = this,

      //Pagelet的ID, 找不到这个ID，则生成一个guid
      pagelet_id = config.id || $.euid('s_pipe'),

      content = config.content || '',
      preMods = config.css,
      postMods = config.js,

      depends = config.depends,

      //Pagelet的容器
      container = $(pagelet_id);

      if (container) {
        //如果spipe已经运行过，或者指定了要直接渲染，可以直接渲染容器
        if (!config.wait || self.hasRan) {
          _log('直接渲染 ' + pagelet_id);
          check_depends_and_run();
        } else {
          regi();
        }
      } else {
        //如果当前文档中找不到容器，新建一个
        container = doc.createElement('div');
        container.id = pagelet_id;
        self._cbs.push(function() {
          var elem = $(self.defaultArea) || doc.body;
          elem.appendChild(container);
          _log(pagelet_id + ' 找不到，已新建一个并插入文档', 'warn');
          check_depends_and_run();
        });
      }

      self.pagelets[pagelet_id] = container;

      //检查依赖的pagelet并渲染
      function check_depends_and_run() {
        if (depends) {
          for (var i = 0; i < depends.length; i++) {
            var depId = depends[i];

            //只要有一个依赖的元素找不到，后面的事情就不用做了
            if (!$(depId)) {
              _log(pagelet_id + ' 需要的前置区块 ' + depId + '还没有准备好.');
              //但是需要不断重试
              setTimeout(arguments.callee, 80);
              return;
            }
          }
        }
        check_css_and_run();
      }

      //检查css(preMods)依赖
      function check_css_and_run() {
        //如果有依赖的文件，先载入文件再初始化
        if (preMods) {
          _log(pagelet_id + ' 依赖CSS模块 ' + assets);
          seajs.use(preMods, run);
        } else {
          run();
        }
      }

      //注册到pagelet初始化事件中
      function regi() {
        self._cbs.push(check_depends_and_run);
        _log(pagelet_id + ' 将在DOMReady时渲染');
      }

      //渲染和执行回调
      function run() {
        if (content) container.innerHTML = content;
        var cb = _invoke(config.onload);
        if (cb) {
          if (postMods) {
            seajs.use(postMods, cb);
          } else {
            cb();
          }
        }
      }

      return self;
    },
    run: function() {
      var fn;
      var _cbs = this._cbs;
      if (_cbs) while (fn = _cbs.shift()) fn.call(this);
      this.hasRun = true;
    }
  };

  window.__spipe = new SPipe();

  window.onload = function() {
    window.__spipe.run();
  };
})(window, document, seajs);
