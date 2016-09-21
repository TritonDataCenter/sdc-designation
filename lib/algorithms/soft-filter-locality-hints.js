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
 * One may want to ensure two VMs/instances land on the same server (for a
 * possible networking speed benefit) or that a number of VMs are NOT on the
 * same server (e.g. replicating databases in a cluster built for HA). This
 * is sometimes known as a "affinity".
 *
 * This sdc-designation algorithm implements "locality hints" -- input params
 * provided at VM creation time -- to support affinity. In `triton` it looks
 * like:
 *
 *	# Affinity: select a server that does not (!=) have instance 'db0'.
 *	triton create --name db1 --affinity 'instance!=db0' ...
 *
 * and in sdc-docker, one of:
 *
 *	docker run --name db1 -e 'affinity:container!=db0' ...
 *	docker run --name db1 \
 *	  --label 'com.docker.swarm.affinities=["container!=db0"]' ...
 *
 * and in cloudapi's CreateMachine request body:
 *
 *	{
 *	  ...
 *	  "locality": {
 *	    "strict": true,
 *	    "far": ["<uuid of VM named 'db0'>"]
 *	  }
 *	}
 *
 * The "locality" object is passed unchanged to this algoritm in
 * `opts.vm.locality`.
 *
 * # Reference
 *
 *	locality: {
 *	  strict: <bool>    // optional, default false
 *	  near: <uuid or array of VM uuids>  // optional, VM uuids
 *	  far: <uuid or array of VM uuids>  // optional
 *	}
 *
 * (Dev Note: This "<uuid or array of uuid>" should change to just support
 * an array. If CloudAPI wants to support loose data structures, then at least
 * it can normalize.)
 *
 * - strict far: Filter out any server that has any of the given VMs.
 * - non-stict far: Filter out any server that has any of the given VMs.
 *   If that reduces to zero servers, then skip the rule: return all servers.
 * - strict near: Filter out any server not hosting all the given VMs.
 * - non-strict near: Filter out any server not hosting *any* of the given VMs.
 *   If that reduces to zero servers, then skip the rule: return all servers.
 * - default: If no "locality" is given, this algoritm does a non-strict
 *   attempt to filter out servers with VMs owned by this customer. In other
 *   words, by default Triton attempts to spread out a customer's VMs.
 *   Customer-facing documentation should promise no more than Triton making
 *   a reasonable attempt to spread out customer VMs by default -- i.e.
 *   exactly how should be left under-specified to allow for future changes.
 *   (Dev Note: Future changes might be: better balancing, balancing by
 *   RBACv2 project, balancing by image, limiting the number of CNs a
 *   customer can land on. This balancing by default *overrides* subsequent
 *   sorting/scoring attempts in the sdc-designation pipeline.)
 *
 * If there are both non-strict "near" *and* "far", then they could be in
 * conflict. This implementation prefers "far". In other words, given
 * `{far: ["db0"], near: ["webhead1"]}`, it will prefer to be on a server other
 * than VM "db0", even if that means not being near "webhead1".
 *
 * # Limitations
 *
 * - Currently affinity is only supported at the server level. I.e. there is no
 *   support for saying "put this VM on the same or different *rack*".
 *
 * - This is a "soft filter". In sdc-designation: the first soft filter "wins".
 *   E.g.:
 *	- candidate servers are CN1 and CN2
 *	- soft-filter-a rules out all but CN1
 *	- soft-filter-b rules out all but CN2 (but at this point only CN1
 *	  remains)
 *   Result: soft-filter-a (the first one) wins. Fine for now. Just something
 *   to be aware of.
 *
 * # snapshot/logs
 *
 * A failing allocation request due to locality looks like this in the
 * allocation snapshot in the CNAPI logs. This says that server
 * "564d37eb-0847-c369-9cd8-552d150108e2" was excluded due to
 * the "inst!=30a72fb4-b5eb-4e92-a542-93d4ca011294" locality (where "30a72fb4*"
 * is the UUID of the VM named "db0").
 *
 *	{
 *	  "step": "Servers with requested locality considered",
 *	  "remaining": [],
 *	  "reasons": {
 *	    "564d37eb-0847-c369-9cd8-552d150108e2":
 *	        "exclude: inst!=30a72fb4-b5eb-4e92-a542-93d4ca011294"
 *	  }
 *	}
 *
 * # Guarding near/far UUIDs to VMs to which the caller has access
 *
 * An end-user (i.e. someone calling CloudAPI) should only be able to specify
 * near/far VMs to which they have access. Currently the implementation of
 * locality hints does *no* guarding in CloudAPI, leaving it to sdc-designation
 * (i.e. this code) to guard. That's the wrong design:
 *
 * - The user-access guarding should be in cloudapi (and sdc-docker) at the
 *   edges to potentially allow cross-owner locality hints from adminui.
 * - More importantly, determining which VMs a given request has access to is
 *   more than comparing `owner_uuid` *when RBAC is in play*. This code can
 *   only effectively do that `owner_uuid` comparison. This isn't *dangerous*
 *   (separate sub-users under the same account won't effectively be able
 *   to cause harm), but it isn't ideal.
 *
 * Dev Note: The eventual goal should be to add guarding to cloudapi's
 * CreateMachine and sdc-docker's CreateContainer and then consider phasing
 * it out of here.
 */

var assert = require('assert-plus');
var shared = require('./shared/locality-hints');


/**
 * Filter `servers` according to `opts.vm.locality` rules.
 */
function
filterSoftLocality(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.func(cb, 'cb');

	var ownerUuid = opts.vm.owner_uuid;
	assert.uuid(ownerUuid, 'opts.vm.owner_uuid');
	var reasons = {};

	if (servers.length === 0) {
		return (cb(null, servers, reasons));
	}

	// Parse "locality". See format notes in top-comment.
	assert.optionalObject(opts.vm.locality, 'opts.vm.locality');
	var locality = opts.vm.locality || {};
	assert.optionalBool(locality.strict, 'locality.strict');
	var strict = Boolean(locality.strict);
	var far = shared.normNearFar(locality.far, 'locality.far');
	var near = shared.normNearFar(locality.near, 'locality.near');

	if (near.length === 0 && far.length === 0) {
		// Default behaviour: basic attempt to spread out the
		// customer's VMs.
		servers = softSpreadByOwner(servers, reasons, ownerUuid);
	} else if (strict) {
		reasons.skip = 'Strict locality requested and no spreading ' +
			'needed';
		return (cb(null, servers, reasons));
	} else {
		// Process `far` first (far wins over near, see notes above).
		if (far.length > 0) {
			servers = shared.filterFar(servers, reasons, far,
				strict, ownerUuid);
		}

		if (servers.length > 0 && near.length > 0) {
			servers = filterNearNonStrict(servers, reasons,
			    near, ownerUuid);
		}
	}

	return (cb(null, servers, reasons));
}


/*
 * A soft attempt to balance a customer's VMs.
 *
 * Filter out all servers with any VMs owned by the same owner, unless that
 * means filtering out all servers.
 *
 * Dev Note: This could be better. E.g., we could balance out on numbers of
 * VMs for this owner, etc. See discussion in the "Reference" above.
 */
function softSpreadByOwner(servers, reasons, ownerUuid) {
	var i, j;
	var excludedServers = [];
	var filteredServers = [];

	for (i = 0; i < servers.length; i++) {
		var server = servers[i];
		var serverVmUuids = Object.keys(server.vms);
		var exclude = false;

		for (j = 0; j < serverVmUuids.length; j++) {
			var vm = server.vms[serverVmUuids[j]];
			if (vm.owner_uuid === ownerUuid) {
				exclude = true;
				break;
			}
		}

		if (exclude) {
			excludedServers.push(server);
		} else {
			filteredServers.push(server);
		}
	}

	if (filteredServers.length === 0) {
		reasons['*']
			= 'exclude: spread by owner (ignored b/c non-strict)';
	} else {
		for (i = 0; i < excludedServers.length; i++) {
			reasons[excludedServers[i].uuid]
				= 'exclude: spread by owner';
		}
		servers = filteredServers;
	}

	return (servers);
}


/*
 * Process `near` (`strict=false`): filter out any server not hosting *any*
 * VMs listed in `near`. If that reduces to zero servers, then skip this filter
 * (return all the servers).
 *
 * `reasons` is modified in place.
 */
function filterNearNonStrict(servers, reasons, near, ownerUuid) {
	var filteredServers = [];
	var nearRemaining = near.slice();

	for (var i = 0; i < servers.length; i++) {
		var server = servers[i];

		for (var j = 0; j < nearRemaining.length; j++) {
			var vm = server.vms[near[j]];
			if (vm &&
			    /* owner_uuid guard (see top comment) */
			    vm.owner_uuid === ownerUuid)
			{
				reasons[server.uuid]
					= 'include: inst==~' + near[j];
				filteredServers.push(server);
				// VM can only be on one server.
				delete nearRemaining[j];
				break;
			}
		}

		if (nearRemaining.length === 0) {
			break;
		}
	}

	if (filteredServers.length === 0) {
		// Non-strict filter: ignore these near filters.
		var nearStr = (near.length > 2
			? near.slice(0, 2).join(',') + ',...'
			: near.join(','));
		reasons['*'] = 'exclude: inst==~' + nearStr
			+ ' (ignored b/c non-strict)';
	} else {
		servers = filteredServers;
	}

	return (servers);
}


module.exports = {
	name: 'Servers with requested soft locality considered',
	run: filterSoftLocality
};
