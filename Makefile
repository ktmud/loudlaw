REPORTER = landing
LOG_FILE = ./var/stdout.log

ifeq ($(NODE_ENV), vps)
	LOG_FILE = /srv/log/nodejs/loudlaw.log
endif

start:
	@DEBUG="* -connect:* -send -express:*" && ./letsgo

vps:
	@export NODE_ENV=vps && DEBUG="* -connect:* -send -express:*" && ./letsgo

test:
	clear
	@./node_modules/mocha/bin/mocha --reporter $(REPORTER)
	@echo "\n"

tail:
	@tail -n 100 -f $(LOG_FILE)

cov: lib-cov
	@EXPRESS_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@-rm -rf ../ll-cov

lib-cov:
	@jscoverage --exclude=.git --exclude=test --exclude=node_modules ./ ../ll-cov

.PHONY: test cov lib-cov
