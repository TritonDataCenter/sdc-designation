/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

/*
 * # Locality hints (a.k.a. a take on VM affinity)
 *
 * See the big-theory statement at the top of soft-filter-locality-hints.js
 * for details how these two plugins work.
 *
 * This plugin deals with hints that have `strict` set, while
 * soft-filter-locality-hints.js deals with everything else.
 */

var assert = require('assert-plus');
var shared = require('./shared/locality-hints');


/**
 * Filter `servers` according to `opts.vm.locality` rules.
 */
function
filterHardLocality(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.func(cb, 'cb');

	var ownerUuid = opts.vm.owner_uuid;
	assert.uuid(ownerUuid, 'opts.vm.owner_uuid');
	var reasons = {};

	if (servers.length === 0)
		return (cb(null, servers, reasons));

	// Parse "locality". See format notes in soft-filter-locality-hints.js
 	// top comment.
	assert.optionalObject(opts.vm.locality, 'opts.vm.locality');
	var locality = opts.vm.locality || {};
	assert.optionalBool(locality.strict, 'locality.strict');
	var strict = Boolean(locality.strict);

	if (!strict) {
		reasons.skip = 'No strict locality requested';
		return (cb(null, servers, reasons));
	}

	var far = shared.normNearFar(locality.far, 'locality.far');
	var near = shared.normNearFar(locality.near, 'locality.near');

	if (near.length === 0 && far.length === 0) {
		reasons.skip = 'No near or far localities requested';
	} else {
		// Process `far` first (far wins over near)
		if (far.length > 0) {
			servers = shared.filterFar(servers, reasons, far,
				strict, ownerUuid);
		}

		if (servers.length > 0 && near.length > 0) {
			servers = filterNearStrict(servers, reasons,
				    near, ownerUuid);
		}
	}

	return (cb(null, servers, reasons));
}


/*
 * Process `near` (`strict=true`): filter out any server not hosting all
 * VMs listed in `near`.
 *
 * `reasons` is modified in place.
 *
 * Dev Note: Seems to me the fastest way to handle strict-near would be to
 * get the server uuid of the first VM in `near`. If that is available and
 * hosts all VMs in `near`, then use it. Else we filter out all servers.
 * Upstack processing will likely have already retrieved info on that
 * VM. This would require a sdc-designation API and CNAPI API
 * change (https://mo.joyent.com/docs/cnapi/master/#SelectServer).
 */
function filterNearStrict(servers, reasons, near, ownerUuid) {
	var filteredServers = [];
	var candidateServer;

	for (var i = 0; i < servers.length; i++) {
		var server = servers[i];
		var vm = server.vms[near[0]];

		/* owner_uuid guard (see top comment) */
		if (vm && vm.owner_uuid === ownerUuid) {
			candidateServer = server;
			break;
		}
	}

	if (!candidateServer) {
		// No server has the VM listed at `near[0]`.
		filteredServers = [];
	} else {
		// `candidateServer` might be it, if it also has the rest
		// of `near`.
		var exclude = false;

		for (var j = 1; j < near.length; j++) {
			if (!candidateServer.vms.hasOwnProperty(near[j])) {
				exclude = true;
				break;
			}
		}

		if (exclude) {
			filteredServers = [];
		} else {
			reasons[candidateServer.uuid] = 'include: inst=='
				+ near.join(',');
			filteredServers = [candidateServer];
		}
	}

	if (filteredServers.length === 0) {
		reasons['*'] = 'exclude: inst==' + near.join(',');
	}
	servers = filteredServers;

	return (servers);
}


module.exports = {
	name: 'Servers with requested hard locality considered',
	run: filterHardLocality
};
