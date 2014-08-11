/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Filters out all servers which contain zones belonging to a given owner.
 */

function
filterSameServers(log, state, servers, constraints)
{
	var reasons = constraints.capacity ? null : {};
	var owner_uuid = constraints.vm.owner_uuid;

	var adequateServers = servers.filter(function (server) {
		var vms = server.vms;
		var vmNames = Object.keys(vms);

		for (var i = 0; i !== vmNames.length; i++) {
			var vmName = vmNames[i];
			var vm_owner = vms[vmName].owner_uuid;

			if (vm_owner === owner_uuid) {
				var msg;

				log.trace('Due to customer on server, ' +
				    'omitting server: ' + server.uuid);

				msg = 'VM\'s owner already has VM ' +
				    vmName + ' on server';
				reasons[server.uuid] = msg;

				return (false);
			}
		}

		return (true);
	});

	return ([adequateServers, reasons]);
}

module.exports = {
	name: 'Servers which do not contain any of an owner\'s zones',
	run: filterSameServers,
	affectsCapacity: true
};
