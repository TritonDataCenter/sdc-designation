/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * When volumes-from is set, filters out all servers except the one that has the
 * volumes.
 */

function
filterVolumesFrom(log, state, servers, constraints)
{
	var adequateServers = servers;
	var reasons = constraints.capacity ? null : {};

	function getMsg(serverUuid, vmUuid) {
		log.trace('Due to volumes-from and missing source VM ' +
		          vmUuid + ', omitting server: ' + serverUuid);
		var msg = 'VM needs volumes from ' + vmUuid + ', which was ' +
			'not found on server';
		return (msg);
	}

	adequateServers = servers.filter(function (server) {
		var vms = server.vms;
		var serverUuid = server.uuid;
		var metadata = constraints.vm.internal_metadata;

		// this only applies to docker containers with volumes-from
		if (!constraints.vm.docker || !metadata) {
			return (true);
		}

		// this was already converted from JSON in validations.js
		var requiredVms = metadata['docker:volumesfrom'];

		if (!requiredVms) {
			return (true);
		}

		for (var i = 0; i !== requiredVms.length; i++) {
			var vmUuid = requiredVms[i];

			if (!vms[vmUuid]) {
				var msg = getMsg(serverUuid, vmUuid);
				reasons[serverUuid] = msg;
				return (false);
			}
		}

		return (true);
	});

	return ([adequateServers, reasons]);
}

module.exports = {
	name: 'Servers containing VMs required for volumes-from',
	run: filterVolumesFrom,
	affectsCapacity: true
};
