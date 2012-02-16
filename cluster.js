var cluster = require('cluster');
var app = require('./app');
var util = require('util');
var conf = require(__dirname + '/conf/configuration.js');

var numCPUs = Math.min(conf.worker, require('os').cpus().length);

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died. restart...');
    cluster.fork();
  });
} else {
  app.boot();
}


