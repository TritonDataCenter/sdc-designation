# Joyent DAPI - Designation API

Repository: <git@git.joyent.com:dapi.git>
Browsing: <https://mo.joyent.com/dapi>
Who: Marsell Kukuljevic, Keith Wesolowski
Tickets/bugs: <https://devhub.joyent.com/jira/browse/DAPI>

# Overview

The Designation API's purpose is to respond with the UUID of a compute node on
which to place a new machine or machine reservation. It needs to be passed a
full payload of the servers in question, a package description, an image
manifest, and details like the owner's UUID.

# Repository

    bin/            Historical scripts for testing and development
    build/          Generated files; e.g., documentation
    deps/           Git submodules used during the build or prior to integration
    docs/           Project docs (restdown)
    lib/            Source files
    node_modules/   Dependencies, under the control of npm
    test/           Test suite; uses nodeunit
    tools/          Miscellaneous dev/upgrade/deployment tools and data.
    GNUmakefile     GNU makefile for docs and preintegration testing
    package.json    npm module info; see also npm-shrinkwrap.json
    README.md       This file

# Development

DAPI provides its API through Javascript only; there is no HTTP service.
All allocation-related HTTP service is provided via CNAPI.  See CNAPI
documentation for information on setting up a CNAPI server for testing.

	$ git clone git@git.joyent.com:dapi.git
	$ cd dapi
	$ make all

To update the docs, edit "docs/index.restdown".  The makefile is used to
rebuild the documentation as well as for pre-integration testing.

Before integrating anything into the gate, run `make prepush` and, if
possible, get a code review.  Do not integrate unless `make prepush`
succeeds!

# Testing

	$ gmake test

# Design Ideas

 * DAPI should support multiple allocation algorithms. Starting with "random"
   and then adding scope for things like "random within this set of compute
   nodes". 
 * Data that DAPI should take into account when selecting a machine (depending
   on algorithm):
     - Load (avg?) - ie, dont place new machines onto a "hot" box
     - Is the machine being purged? Compute nodes may be in the process of
       being shut down? (this may be a state that cnapi will just control)
 * The concept of distance between servers. If I want to be able to define a
   bunch of costs / weights of being close / far away in terms of physical
   machine placement. This includes. Same CN, Same Role, Same Rack, Different
   Rack, Different electrical circuit, different switch. Kind of complicated.
   For things like determining "distance" between compute nodes, we may want to
   consider assigning weights to certain CN properties. ex: a different rack is
   worth 1000, a different compute node, is worth 100. This would be like a
   route metric - and the concept is familiar
