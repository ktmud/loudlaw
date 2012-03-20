function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
'Oct', 'Nov', 'Dec'];

module.exports = {
  timestamp: function() {
    var d = new Date();
    var time = [pad(d.getHours()),
      pad(d.getMinutes()),
    pad(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
  }
};
