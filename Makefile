CWD=`pwd`

build:
	@docpad generate
	@cp -r out/ .
	@rm -r out
	
test:
	# node test/db.js

.PHONY: test