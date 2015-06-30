
BIN = ./node_modules/.bin
MOCHA = $(BIN)/mocha
ESLINT = $(BIN)/eslint

test: ./test/*.js
	$(MOCHA)

eslint: index.js ./test/*.js
	$(ESLINT) $^

.PHONY: test eslint
