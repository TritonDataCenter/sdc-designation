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
filterMinDisk(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.object(opts.img, 'opts.img');
	assert.optionalObject(opts.pkg, 'opts.pkg');
	assert.object(opts.defaults, 'opts.defaults');
	assert.func(cb, 'cb');

	var override = opts.defaults.filter_min_resources;
	var img = opts.img;
	var pkg = opts.pkg;
	var vm  = opts.vm;
	var reasons = {};
	var filter;

	if (typeof (override) !== 'undefined' && !override) {
		reasons.skip = 'Do not filter out based on unreserved disk';
		return (cb(null, servers, reasons));
	}

	/* VM allocation without a quota is also valid */
	if (!vm.quota && !(pkg && pkg.quota)) {
		reasons.skip = 'Vm and pkg have no quota';
		return (cb(null, servers, reasons));
	}

	if (pkg && pkg.overprovision_disk) {
		var requestedDisk;

		// VM quota takes precedence over pkg quota. The former is in
		// GiB, while the latter is in MiB.
		var quota = vm.quota ? vm.quota * 1024 : pkg.quota;

		if (vm.brand === 'kvm' || img.type === 'zvol') {
			// image_size applies to disk[0], quota to disk[1]
			requestedDisk = quota + img.image_size;
		} else {
			requestedDisk = Math.ceil(quota /
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
			if (!pkg)
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
