REPORTER = landing
LOG_FILE = ./var/stdout.log

ifeq ($(NODE_ENV), vps)
	LOG_FILE = /srv/log/nodejs/loudlaw.log
endif

test:
	clear
	./node_modules/mocha/bin/mocha --reporter $(REPORTER)
	@echo "\n"

tail:
	@tail -n 100 -f $(LOG_FILE)

vps product:
	@MOCHA_ENV=$@ $(MAKE) test

cov: lib-cov
	@EXPRESS_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@-rm -rf ../ll-cov

lib-cov:
	@jscoverage --exclude=.git --exclude=test --exclude=node_modules ./ ../ll-cov

.PHONY: test cov lib-cov
