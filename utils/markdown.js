/**
* a custom markdown parser for output contents
*/
var marked = require('marked');
var chinese_numbers = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
var reg_decree_date = /<li>date: (.+)<\/li>/;
var fun_decree_date = function(str, date, whole) {
  tmp = date.split('-');
  var year_ = tmp[0];
  var year = '';
  for (var i = 0, l = year_.length; i < l; i++) {
    var num = parseInt(year_[i], 10);
    year += num < 10 ? chinese_numbers[num] : year_[i];
  }

  var month = parseInt(tmp[1], 10);
  if (month < 11) {
    month = chinese_numbers[month];
  } else {
    month = '十' + chinese_numbers[month - 10];
  }
  var day = parseInt(tmp[2], 10);
  if (day < 11) {
    day = chinese_numbers[day];
  } else if (day < 20) {
    day = '十' + chinese_numbers[day - 10];
  } else if (day == 20) {
    day = '二十';
  } else {
    day = chinese_numbers[Math.floor(day / 10)] + '十' +
    chinese_numbers[day % 10];
  }
  var date_str = year + '年' + month + '月' + day + '日';
  return '<li class="decree-date">' + date_str + '</li>';
};
var reg_empty_dt = /<dt>\s*<\/dt>/g;

marked.setOptions({
  gfm: true,
});

module.exports = function(text) {
  text = marked.parse(text);
  text = text.replace('<p>No. ', '<p class="decree-number">');
  text = text.replace('<p>@', '<p class="decree-receiver">');
  text = text.replace('<ul>\n<li>from: ', '<ul class="decree-meta"><li class="decree-commander">');
  text = text.replace(reg_decree_date, fun_decree_date);
  text = text.replace(reg_empty_dt, '');
  return text;
};
