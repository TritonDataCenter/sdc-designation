/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers with more unreserved CPU than the CPU requested for this
 * allocation.
 */

function
filterMinCpu(log, servers, constraints)
{
	var override = constraints.defaults.filter_min_resources;
	var vm       = constraints.vm;
	var pkg      = constraints.pkg;
	var reasons  = {};
	var filter;

	if (typeof (override) !== 'undefined' && !override)
		return ([servers]);

	if (!vm.cpu_cap && pkg && pkg.cpu_cap)
		vm.cpu_cap = pkg.cpu_cap;

	/* VM allocation without a cpu_cap is also valid */
	if (!vm.cpu_cap)
		return ([servers]);

	if (pkg && pkg.overprovision_cpu) {
		var requestedCpu = vm.cpu_cap / pkg.overprovision_cpu;

		filter = function (server) {
			if (server.unreserved_cpu >= requestedCpu)
				return (true);

			var msg = 'VM\'s calculated ' + requestedCpu +
				' CPU is less than server\'s spare ' +
				server.unreserved_cpu;
			reasons[server.uuid] = msg;

			return (false);
		};
	} else {
		filter = function (server) {
			var serverCpu = server.overprovision_ratios.cpu;

			if (!serverCpu)
				return (true);

			// if pkg was not provided, assume ratio does not matter
			if (!pkg)
				return (true);

			var msg = 'Package gave no CPU overprovision ' +
				'ratio, but server has ratio ' + serverCpu;
			reasons[server.uuid] = msg;

			return (false);
		};
	}

	return ([servers.filter(filter), reasons]);
}

module.exports = {
	name: 'Servers with enough unreserved CPU',
	run: filterMinCpu
};
