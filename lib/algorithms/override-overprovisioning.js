/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * This strips any overprovisioning attributes and sets them all to the
 * hardcoded defaults.
 */

var DEFAULT_SERVER_RATIOS = { cpu: 4, ram: 1, disk: 1 };

function
overrideOverprovisioning(log, state, servers, constraints)
{
	var pkg = constraints.pkg;

	pkg.overprovision_cpu = DEFAULT_SERVER_RATIOS.cpu;
	pkg.overprovision_ram = DEFAULT_SERVER_RATIOS.ram;
	pkg.overprovision_disk = DEFAULT_SERVER_RATIOS.disk;
	delete pkg.overprovision_net;
	delete pkg.overprovision_io;

	servers.forEach(function (server) {
		server.overprovision_ratios = DEFAULT_SERVER_RATIOS;
	});

	return ([servers]);
}

module.exports = {
	name: 'Force overprovisioning to fixed values',
	run: overrideOverprovisioning,
	affectsCapacity: true
};
