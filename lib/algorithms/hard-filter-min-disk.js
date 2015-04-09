/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers with more unreserved disk than the disk requested for this
 * allocation.
 */

function
filterMinDisk(log, state, servers, constraints)
{
	var reasons  = constraints.capacity ? null : {};
	var override = constraints.defaults.filter_min_resources;
	var img = constraints.img;
	var pkg = constraints.pkg;
	var vm  = constraints.vm;
	var filter;

	if (typeof (override) !== 'undefined' && !override)
		return ([servers]);

	/* VM allocation without a quota is also valid */
	if (!vm.quota)
		return ([servers]);

	if (pkg && pkg.overprovision_disk) {
		var requestedDisk;

		if (vm.brand === 'kvm' || img.type === 'zvol') {
			/*
			 * image_size applies to disk[0], quota to disk[1],
			 * and 10240 is the root dataset size
			 */
			requestedDisk = vm.quota + img.image_size + 10240;
		} else {
			requestedDisk = vm.quota / pkg.overprovision_disk;
		}

		filter = function (server) {
			if (server.unreserved_disk >= requestedDisk)
				return (true);

			if (reasons) {
				var msg = 'VM\'s calculated ' + requestedDisk +
				    ' disk is less than server\'s spare ' +
				    server.unreserved_disk;
				reasons[server.uuid] = msg;
			}

			return (false);
		};
	} else {
		filter = function (server) {
			var serverDisk = server.overprovision_ratios.disk;

			if (!serverDisk)
				return (true);

			// if pkg was not provided, assume ratio does not matter
			if (!constraints.pkg)
				return (true);

			if (reasons) {
				var msg = 'Package gave no disk ' +
				    'overprovision ratio, but ' +
				    'server has ratio ' + serverDisk;
				reasons[server.uuid] = msg;
			}

			return (false);
		};
	}

	return ([servers.filter(filter), reasons]);
}

module.exports = {
	name: 'Servers with enough unreserved disk',
	run: filterMinDisk,
	affectsCapacity: true
};
