#
# Copyright (c) 2014, Joyent, Inc. All rights reserved.
#
# If you find yourself adding support for new targets that could be useful for
# other projects too, you should add these to the original versions of the
# included Makefiles (in eng.git) so that other teams can use them too.
#
# Note that this makefile does not contain most of the rules that other SDC
# components' do; that's because this is not an HTTP server and does not
# have its own zone.  Accordingly, there's no need for any of the prebuilt
# node nonsense, SMF manifests, or zone metadata.  This is a single, simple
# node module.
#

#
# Tools
#
NODEUNIT  := ./node_modules/.bin/nodeunit

#
# Files
#
DOC_FILES	 = index.restdown
JS_FILES	:= $(shell find lib test bin -name '*.js')
JSL_CONF_NODE	 = tools/jsl.node.conf
JSL_FILES_NODE   = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSSTYLE_FLAGS    = -o indent=tab,doxygen,unparenthesized-return=1

NODE		?= /opt/local/bin/node
NPM_EXEC	?= /opt/local/bin/npm
NPM		 = $(NPM_EXEC)

include ./tools/mk/Makefile.defs
include ./tools/mk/Makefile.node_deps.defs

ROOT            := $(shell pwd)

#
# Repo-specific targets
#
.PHONY: all
all: $(NODEUNIT) $(REPO_DEPS)
	$(NPM) rebuild

$(NODEUNIT): | $(NPM_EXEC)
	$(NPM) install

CLEAN_FILES += $(NODEUNIT) ./node_modules/tap

.PHONY: test
test: $(NODEUNIT)
	$(NODEUNIT) test/*.test.js test/algorithms/*.test.js

include ./tools/mk/Makefile.deps
include ./tools/mk/Makefile.node_deps.targ
include ./tools/mk/Makefile.targ
