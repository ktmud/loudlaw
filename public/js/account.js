define(function(require, exports, module) {
  var ui_base = require('ui-base');
  var $ = window.jQuery || ui_base.jquery;
  var _ = ui_base.underscore;

  function simple_crypt(str, salt) {
    var str = escape(str), ret = '';
    for (var i = str.length - 1; i >= 0; i--) {
      ret += String.fromCharCode(str.charCodeAt(i) + 5);
    }
    return escape(ret);
  }

  function simple_decrypt(str, salt) {
    var str = unescape(str), ret = '';
    for (var i = str.length - 1; i >= 0; i--) {
      ret += String.fromCharCode(str.charCodeAt(i) - 5);
    }
    return unescape(ret);
  }

  return {
    _init_login: function _init_login() {
      var form = $('#login').holderLabel();
    },
    _init_register: function _init_register() {
      var form = $('#register').holderLabel();
      form.submit(function() {
        var elems = this.elements;
        var email = elems.email.value;
        var pwd = elems.password;
        var pwd2 = elems.password2;
        pwd.value = simple_crypt(pwd.value, email);
        pwd.name = 'crypt_pwd';
        pwd2.value = simple_crypt(pwd2.value, email);
        pwd2.name = 'crypt_pwd2';
      });
    },
    init: function(action) {
      var action = '_init_' + action;
      this[action] && this[action]();
    }
  };
});
