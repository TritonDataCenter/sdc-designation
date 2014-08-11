/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */

function
filterMinRam(log, state, servers, constraints)
{
	var reasons = constraints.capacity ? null : {};
	var filter;

	if (constraints.pkg.overprovision_ram) {
		var requestedRam = constraints.vm.ram /
		    constraints.pkg.overprovision_ram;

		filter = function (server) {
			if (server.unreserved_ram >= requestedRam)
				return (true);

			if (reasons) {
				var msg = 'VM\'s calculated ' + requestedRam +
				    ' RAM is less than server\'s spare ' +
				    server.unreserved_ram;
				reasons[server.uuid] = msg;
			}

			return (false);
		};
	} else {
		filter = function (server) {
			var serverRam = server.overprovision_ratios.ram;
			if (!serverRam)
				return (true);

			if (reasons) {
				var msg = 'Package gave no RAM overprovision ' +
				    'ratio, but server has ratio ' + serverRam;
				reasons[server.uuid] = msg;
			}

			return (false);
		};
	}

	return ([servers.filter(filter), reasons]);
}

module.exports = {
	name: 'Servers with enough unreserved RAM',
	run: filterMinRam,
	affectsCapacity: true
};
