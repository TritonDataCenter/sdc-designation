/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Sorts and filters out the servers which have the most number of zones
 * belonging to a given owner.
 */

/* how many of the servers with the least of an owner's zones to pass along */
var KEEP_RATIO = 0.25;

function
filterManyZones(log, state, servers, constraints)
{
	var owner_uuid = constraints.vm.owner_uuid;
	var keepNumServers;
	var fewestZoneCounts;
	var fewestZonesServers;

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

	keepNumServers = servers.length * KEEP_RATIO;
	if (keepNumServers < 1)
		keepNumServers = 1;

	fewestZoneCounts = zoneCounts.slice(0, keepNumServers);

	fewestZonesServers = fewestZoneCounts.map(function (zoneCount) {
		return (zoneCount[1]);
	});

	return ([fewestZonesServers]);
}

module.exports = {
	name: 'Servers which contain fewer of an owner\'s zones',
	run: filterManyZones,
	affectsCapacity: false
};
