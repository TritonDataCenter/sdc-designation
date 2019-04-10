/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2017 Joyent, Inc.
 */

/*
 * When volumes-from is set, filters out all servers except the one that has the
 * volumes.
 *
 * If opts.getVm is set, the plugin loads VMs while checking if they apply to
 * any of the servers. If opts.getVm is not set, the plugin assumes the
 * servers.vms are already populated.
 */

var assert = require('assert-plus');


function
filterVolumesFrom(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.object(opts.log, 'opts.log');
	assert.optionalFunc(opts.getVm, 'opts.getVm');
	assert.func(cb, 'cb');

	var log = opts.log;
	var reasons = {};
	var metadata = opts.vm.internal_metadata;

	// this only applies to docker containers with volumes-from
	if (!opts.vm.docker || !metadata) {
		reasons.skip = 'Requested VM is not a Docker container ' +
			'and/or has no internal_metadata';
		return (cb(null, servers, reasons));
	}

	// this was already converted from JSON in validations.js
	var requiredVms = metadata['docker:volumesfrom'];

	if (!requiredVms || requiredVms.length === 0) {
		reasons.skip = 'Requested VM has no VMs listed in ' +
			'internal_data docker:volumesfrom';
		return (cb(null, servers, reasons));
	}

	var getVm = opts.getVm;
	if (getVm) {
		loadVmAndFilter(log, servers, requiredVms, getVm, cb);
	} else {
		filterByPreloadedVms(log, servers, requiredVms, cb);
	}

	return (null); // silence linter
}


/*
 * server.vms is already populated, so we check all servers until we
 * find a vms hash that contains all requiredVms UUIDs.
 */
function
filterByPreloadedVms(log, servers, requiredVms, cb)
{
	log.debug('opts.getVm not set; assuming preloaded VMs');

	var reasons = {};

	var adequateServers = servers.filter(function (server) {
		var vms = server.vms;
		var serverUuid = server.uuid;

		for (var i = 0; i !== requiredVms.length; i++) {
			var vmUuid = requiredVms[i];

			if (!vms[vmUuid]) {
				var msg = genErrMsg(log, serverUuid, vmUuid);
				reasons[serverUuid] = msg;
				return (false);
			}
		}

		return (true);
	});

	return (cb(null, adequateServers, reasons));
}


/*
 * server.vms is not yet populated, so we fetch the information for
 * VMs listed in requiredVms, and determine if they are all on the same server,
 * and that said server is in our list of servers.
 *
 * This function does this by invoking the opts.getVm function, a function
 * provided to when dapi is initialized. opts.getVm takes a VM UUID, and returns
 * a VM object in the callback.
 *
 * To minimize the number of queries, we don't load in parallel, only
 * proceeding to the next query when we're sure that we still have a server
 * which has all the previous queried VMs. The tradeoff is higher latency.
 */
function
loadVmAndFilter(log, servers, requiredVms, getVm, cb)
{
	log.debug('opts.getVm set; fetching VMs listed in volumes-from');

	var reasons = {};
	var remainingVms = requiredVms.slice(); // Get a copy, b/c we mutate it.

	function step() {
		if (remainingVms.length === 0 || servers.length === 0) {
			return (cb(null, servers.slice(0, 1), reasons));
		}

		var vmUuid = remainingVms.shift();

		return getVm({ uuid: vmUuid }, {}, function getVmCb(err, vm) {
			if (err) {
				log.error('Error loading VM', err);

				reasons['*'] = 'Error loading VM ' + vmUuid +
					': ' + err.message;

				// is this the right thing to do...?
				return (cb(null, [], reasons));
			}

			servers = servers.filter(function (server) {
				if (server.uuid === vm.server_uuid) {
					return (true);
				}

				var msg = genErrMsg(log, server.uuid, vmUuid);
				reasons[server.uuid] = msg;
				return (false);
			});

			return (step());
		});
	}

	step();
}


function genErrMsg(log, serverUuid, vmUuid) {
	log.trace('Due to volumes-from and missing source VM ' + vmUuid +
		', omitting server: ' + serverUuid);
	var msg = 'VM needs volumes from ' + vmUuid + ', which was not found ' +
		'on server';
	return (msg);
}


module.exports = {
	name: 'Servers containing VMs required for volumesfrom',
	run: filterVolumesFrom
};
