/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
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
