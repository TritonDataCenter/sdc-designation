/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */

function
filterMinRam(log, state, servers, constraints)
{
	var reasons  = constraints.capacity ? null : {};
	var override = constraints.defaults.filter_min_resources;
	var filter;

	if (typeof (override) !== 'undefined' && !override)
		return ([servers]);

	if (constraints.pkg && constraints.pkg.overprovision_ram) {
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

			// if pkg was not provided, assume ratio does not matter
			if (!constraints.pkg)
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
