var zombie = require('zombie');

var app = require('../app');

app.boot();

exports.servers = {};
exports.browser = new zombie();
