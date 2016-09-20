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

var assert = require('assert-plus');

var MiB = 1024 * 1024;
var FUDGE_MB = 10 * 1024; // leave 10GiB additional space, just in case

function
filterMinDisk(log, servers, constraints, cb)
{
	assert.object(log);
	assert.arrayOfObject(servers);
	assert.object(constraints);
	assert.object(constraints.vm);
	assert.func(cb);

	var override = constraints.defaults.filter_min_resources;
	var img = constraints.img;
	var pkg = constraints.pkg;
	var vm  = constraints.vm;
	var reasons = {};
	var filter;

	if (typeof (override) !== 'undefined' && !override) {
		reasons.skip = 'Do not filter out based on minimum free disk';
		return (cb(null, servers, reasons));
	}

	/* VM allocation without a quota is also valid */
	if (!vm.quota && !(pkg && pkg.quota)) {
		reasons.skip = 'Vm and pkg have no quota';
		return (cb(null, servers, reasons));
	}

	if (pkg && pkg.overprovision_disk) {
		var requestedDisk;

		if (vm.brand === 'kvm' || img.type === 'zvol') {
			// image_size applies to disk[0], quota to disk[1]
			requestedDisk = pkg.quota + img.image_size;
		} else {
			requestedDisk = Math.ceil(pkg.quota /
			        pkg.overprovision_disk);
		}

		// make sure we have space for the image itself, just in case
		var overhead = img.files.reduce(function (acc, image) {
			return (acc + image.size);
		}, 0) / MiB;
		requestedDisk += Math.ceil(overhead) + FUDGE_MB;

		filter = function (server) {
			if (server.unreserved_disk >= requestedDisk)
				return (true);

			var msg = 'VM\'s calculated ' + requestedDisk +
				' MiB disk is more than server\'s spare ' +
				server.unreserved_disk + ' MiB';
			reasons[server.uuid] = msg;

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

			var msg = 'Package gave no disk overprovision ratio, ' +
				'but server has ratio ' + serverDisk;
			reasons[server.uuid] = msg;

			return (false);
		};
	}

	return (cb(null, servers.filter(filter), reasons));
}

module.exports = {
	name: 'Servers with enough unreserved disk',
	run: filterMinDisk
};
