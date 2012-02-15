var cwd = process.cwd();
var Dataset = require(cwd + '/lib/Dataset.js');
var util = require('util');

var gets = {
};

var puts = {
};

var more = {
};

module.exports = central.lib._.extend(new Dataset({
  // how to fetch the original data
  gets: gets,
  puts: puts,
  _design: require('./_design'),
  dbname: ''
}), more);
