start:
	supervisor -w \
  'lib,servers,modules,datasets,models,app.js,cluster.js,node_modules,conf,test' -- --debug cluster.js

test:
	./node_modules/.bin/mocha \
		--reporter list

.PHONY: test test
