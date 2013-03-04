#
# Copyright (c) 2012, Joyent, Inc. All rights reserved.
#
# Makefile: basic Makefile for template API service
#
# This Makefile is a template for new repos. It contains only repo-specific
# logic and uses included makefiles to supply common targets (javascriptlint,
# jsstyle, restdown, etc.), which are used by other repos as well. You may well
# need to rewrite most of this file, but you shouldn't need to touch the
# included makefiles.
#
# If you find yourself adding support for new targets that could be useful for
# other projects too, you should add these to the original versions of the
# included Makefiles (in eng.git) so that other teams can use them too.
#

NODE_PREBUILT_VERSION=v0.8.21
NODE_PREBUILT_TAG=zone

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
JSSTYLE_FLAGS    = -o indent=4,doxygen,unparenthesized-return=0
SMF_MANIFESTS_IN = smf/manifests/dapi.xml.in

include ./tools/mk/Makefile.defs
include tools/mk/Makefile.node_prebuilt.defs
# include tools/mk/Makefile.node.defs
include ./tools/mk/Makefile.node_deps.defs
include ./tools/mk/Makefile.smf.defs

ROOT            := $(shell pwd)
RELEASE_TARBALL := dapi-pkg-$(STAMP).tar.bz2
TMPDIR          := /tmp/$(STAMP)

#
# Repo-specific targets
#
.PHONY: all
all: $(SMF_MANIFESTS) | $(NODEUNIT) $(REPO_DEPS)
	$(NPM) rebuild

$(NODEUNIT): | $(NPM_EXEC)
	$(NPM) install

CLEAN_FILES += $(NODEUNIT) ./node_modules/tap


.PHONY: release
release: all deps docs $(SMF_MANIFESTS)
	@echo "Building $(RELEASE_TARBALL)"
	@mkdir -p $(TMPDIR)/root/opt/smartdc/dapi/build
	@mkdir -p $(TMPDIR)/site
	@touch $(TMPDIR)/site/.do-not-delete-me
	cp -PR $(NODE_INSTALL) $(TMPDIR)/root/opt/smartdc/dapi/build/node
	cp -r $(ROOT)/lib \
    $(ROOT)/Makefile \
    $(ROOT)/node_modules \
    $(ROOT)/package.json \
    $(ROOT)/bin \
    $(ROOT)/smf \
    $(ROOT)/tools \
    $(TMPDIR)/root/opt/smartdc/dapi/
	(cd $(TMPDIR) && $(TAR) -jcf $(ROOT)/$(RELEASE_TARBALL) root site)
	@rm -rf $(TMPDIR)


.PHONY: publish
publish: release
	@if [[ -z "$(BITS_DIR)" ]]; then \
    echo "error: 'BITS_DIR' must be set for 'publish' target"; \
    exit 1; \
  fi
	mkdir -p $(BITS_DIR)/dapi
	cp $(ROOT)/$(RELEASE_TARBALL) $(BITS_DIR)/dapi/$(RELEASE_TARBALL)


.PHONY: test
test: $(NODEUNIT)
	$(NODEUNIT) test/*.test.js test/algorithms/*.test.js

include ./tools/mk/Makefile.deps
include tools/mk/Makefile.node_prebuilt.targ
# include ./tools/mk/Makefile.node.targ
include ./tools/mk/Makefile.node_deps.targ
include ./tools/mk/Makefile.smf.targ
include ./tools/mk/Makefile.targ
