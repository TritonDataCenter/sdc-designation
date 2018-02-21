/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2018, Joyent, Inc.
 */

/*
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */

var assert = require('assert-plus');

function
filterMinRam(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.optionalObject(opts.pkg, 'opts.pkg');
	assert.object(opts.defaults, 'opts.defaults');
	assert.func(cb, 'cb');

	var override = opts.defaults.filter_min_resources;
	var vm  = opts.vm;
	var pkg = opts.pkg;
	var reasons = {};
	var filter;

	if (typeof (override) !== 'undefined' && !override) {
		reasons.skip = 'Do not filter out based on minimum free RAM';
		return (cb(null, servers, reasons));
	}

	if (pkg && pkg.overprovision_ram) {
		var requestedRam = vm.ram || pkg.max_physical_memory;

		if (['bhyve','kvm'].indexOf(vm.brand) === -1)
			requestedRam /= pkg.overprovision_ram;

		filter = function (server) {
			if (server.unreserved_ram >= requestedRam)
				return (true);

			var msg = 'VM\'s calculated ' + requestedRam +
				' RAM is less than server\'s spare ' +
				server.unreserved_ram;
			reasons[server.uuid] = msg;

			return (false);
		};
	} else {
		filter = function (server) {
			var serverRam = server.overprovision_ratios.ram;
			if (!serverRam)
				return (true);

			// if pkg was not provided, assume ratio does not matter
			if (!pkg)
				return (true);

			var msg = 'Package gave no RAM overprovision ' +
				'ratio, but server has ratio ' + serverRam;
			reasons[server.uuid] = msg;

			return (false);
		};
	}

	return (cb(null, servers.filter(filter), reasons));
}

module.exports = {
	name: 'Servers with enough unreserved RAM',
	run: filterMinRam
};
