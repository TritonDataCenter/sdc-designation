/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * Sort servers with fewer VMs owned by `constraints.vm.owner_uuid` first.
 */

function
sortMinOwnerZones(log, state, servers, constraints)
{
	var owner_uuid = constraints.vm.owner_uuid;
	var orderedServers;

	var server_spread = (constraints.pkg &&
		constraints.pkg.alloc_server_spread ||
		constraints.defaults.server_spread);
	if (server_spread !== 'min-owner') {
		return ([
			servers,
			{
				skip: '"server_spread" is not "min-owner": '
					+ server_spread
			}
		]);
	}

	var reasons = {};  // <server uuid> -> <count>
	var counts = [];   // [<count>, <server>]
	for (var i = 0; i < servers.length; i++) {
		var server = servers[i];
		var vmUuids = Object.keys(server.vms);
		var count = 0;
		for (var j = 0; j < vmUuids.length; j++) {
			if (server.vms[vmUuids[j]].owner_uuid === owner_uuid) {
				count++;
			}
		}
		counts.push([count, server]);
		reasons[server.uuid] = count;
	}

	counts.sort(function cmp(a, b) {
		var a_cmp = a[0];
		var b_cmp = b[0];
		if (a_cmp < b_cmp) {
			return (-1);
		} else if (a_cmp > b_cmp) {
			return (1);
		}
		return (0);
	});

	orderedServers = counts.map(function (zoneCount) {
		return (zoneCount[1]);
	});

	return ([orderedServers, reasons]);
}

module.exports = {
	name: 'Sort servers by minimum zones belonging to owner',
	run: sortMinOwnerZones,
	affectsCapacity: false
};
