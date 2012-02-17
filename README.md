# Joyent DAPI - Designation API

Repository: <git@git.joyent.com:dapi.git>
Browsing: <https://mo.joyent.com/dapi>
Who: ?
Tickets/bugs: <https://devhub.joyent.com/jira/browse/DAPI>


# Overview

The Designation API's purpose is to respond with the UUID of a compute node on
which to place a new machine or machine reservation. It needs to be passed a
full payload of the machine in question, the server role, IP address required,
dataset required, and quota. (At least)

# Repository

    deps/           Git submodules and/or commited 3rd-party deps should go
                    here. See "node_modules/" for node.js deps.
    docs/           Project docs (restdown)
    lib/            Source files.
    node_modules/   Node.js deps, either populated at build time or commited.
                    See Managing Dependencies.
    pkg/            Package lifecycle scripts
    smf/manifests   SMF manifests
    smf/methods     SMF method scripts
    test/           Test suite (using node-tap)
    tools/          Miscellaneous dev/upgrade/deployment tools and data.
    Makefile
    package.json    npm module info (holds the project version)
    README.md


# Development

To run the boilerplate API server:

    git clone git@git.joyent.com:eng.git
    cd eng
    git submodule update --init
    make all
    node server.js

To update the guidelines, edit "docs/index.restdown" and run `make docs`
to update "docs/index.html".

Before commiting/pushing run `make prepush` and, if possible, get a code
review.



# Testing

    make test

If you project has setup steps necessary for testing, then describe those
here.



# Other Sections Here

Add other sections to your README as necessary. E.g. Running a demo, adding
development data.


# Design Ideas

 * DAPI should support multiple allocation algorithms. Starting with "random"
   and then adding scope for things like "random within this set of compute
   nodes". 
 * Data that DAPI shoudl take into account when selecting a machine (depending
   on algorithm):
     - Amount of RAM available
     - Amount of DISK available
     - Load (avg?) - ie, dont place new machines onto a "hot" box
     - Is the machine being purged? Compute nodes may be in the process of
       being shut down? (this may be a state that cnapi will just control)
 * Users may be able to select a placement "policy". This policy will determine
   which algorithm is used. For example, they may be building HA postgres setup.
   They will want machines to be within the same availability zone, but not on
   the same CN.
 * The concept of distance between servers. If I want to be able to define a
 * bunch of costs / weights of being close / far away in terms of physical
 * machine placement. This includes. Same CN, Same Role, Same Rack, Different
 * Rack, Different electrical circuit, different switch. Kind of complicated.
 * For things like determining "distance" between compute nodes, we may want to
   consider assigning weights to certain CN properties. ex: a different rack is
   worth 1000, a different compute node, is worth 100. This would be like a
   route metric - and the concept is familiar


# TODO

Remaining work for this repo:

