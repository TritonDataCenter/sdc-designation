<!--
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
-->

<!--
    Copyright (c) 2016, Joyent, Inc.
-->

# sdc-designation

This repository is part of the Joyent Triton project. See the [contribution
guidelines](https://github.com/joyent/triton/blob/master/CONTRIBUTING.md) --
*Triton does not use GitHub PRs* -- and general documentation at the main
[Triton project](https://github.com/joyent/triton) page.

The purpose of this module is to select a compute node for provisioning
an instance when an undirected request has been made.  The module is
consumed by CNAPI; the code in this repository does not provide any
externally-visible interfaces.

# Development

sdc-designation provides its API through Javascript only; there is no
HTTP service.  All allocation-related HTTP service is provided via
CNAPI.  See CNAPI documentation for information on setting up a CNAPI
server for testing.

To update the docs, edit "docs/index.md".  The makefile is used to
rebuild the documentation as well as for pre-integration testing.

Before integrating anything into the gate, run `make prepush` and get a
code review.  Do not integrate unless `make prepush` succeeds!

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
