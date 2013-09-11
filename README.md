# Joyent DAPI - Designation API

Repository: <git@git.joyent.com:dapi.git>
Browsing: <https://mo.joyent.com/dapi>
Who: Marsell Kukuljevic
Tickets/bugs: <https://devhub.joyent.com/jira/browse/DAPI>


# Overview

The Designation API's purpose is to respond with the UUID of a compute node on
which to place a new machine or machine reservation. It needs to be passed a
full payload of the servers in question, a package description, an image
manifest, and details like the owner's UUID.

# Repository

    bin/            Scripts for running or benching DAPI.
    boot/           Scripts used during the setup of a DAPI zone.
    build/          Where compiled node and generated docs go.
    deps/           Git submodules and/or commited 3rd-party deps should go here.
    docs/           Project docs (restdown)
    lib/            Source files.
    node_modules/   Node.js deps, either populated at build time or commited.
    smf/manifests   SMF manifests
    smf/methods     SMF method scripts
    test/           Test suite (using node-tap)
    tools/          Miscellaneous dev/upgrade/deployment tools and data.
    Makefile
    package.json    npm module info (holds the project version)
    README.md


# Development

To run the DAPI server:

    git clone git@git.joyent.com:dapi.git
    cd dapi
    make all
    node bin/server.js

To update the docs, edit "docs/index.restdown".

Before commiting/pushing run `make prepush` and, if possible, get a code
review.



# Testing

In one terminal, run DAPI:

    node bin/server.js

In another, run the tests:

    make test



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
