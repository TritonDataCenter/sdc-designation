/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Sorts servers by the minimum number of zones belonging to an owner that
 * a server has.
 */

function
sortMinOwnerZones(log, state, servers, constraints)
{
	var owner_uuid = constraints.vm.owner_uuid;
	var orderedServers;

	if ((constraints.pkg && constraints.pkg.alloc_server_spread ||
	    constraints.defaults.server_spread) !== 'min-owner')
		return ([servers]);

	var zoneCounts = servers.map(function (server) {
		var owned = 0;
		var vms = server.vms;
		var vmNames = Object.keys(vms);

		for (var i = 0; i !== vmNames.length; i++) {
			var vm_owner = vms[vmNames[i]].owner_uuid;

			if (vm_owner === owner_uuid)
				owned++;
		}

		return ([owned, server]);
	});

	zoneCounts.sort();

	orderedServers = zoneCounts.map(function (zoneCount) {
		return (zoneCount[1]);
	});

	return ([orderedServers]);
}

module.exports = {
	name: 'Sort servers by minimum zones belonging to owner',
	run: sortMinOwnerZones,
	affectsCapacity: false
};
