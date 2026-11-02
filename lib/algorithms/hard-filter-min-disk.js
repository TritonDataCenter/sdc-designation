/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2018, Joyent, Inc.
 * Copyright 2026 Edgecast Cloud LLC.
 */

/*
 * Returns servers with more unreserved disk than the disk requested for this
 * allocation.
 */

var assert = require('assert-plus');
var hvmDisks = require('./shared/hvm-disks');

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

	var isHvm = ['bhyve', 'kvm'].indexOf(vm.brand) !== -1 ||
	    img.type === 'zvol';

	/* VM allocation without a quota is also valid */
	if (!isHvm && !vm.quota && !(pkg && pkg.quota)) {
		reasons.skip = 'Vm and pkg have no quota';
		return (cb(null, servers, reasons));
	}

	if (isHvm || (pkg && pkg.overprovision_disk)) {
		var requestedDisk;

		if (isHvm) {
			requestedDisk = hvmRequestedDisk(vm, img, pkg);
		} else {
			// VM quota takes precedence over pkg quota. The
			// former is in GiB, while the latter is in MiB.
			var quota = vm.quota ? vm.quota * 1024 : pkg.quota;

			requestedDisk = Math.ceil(quota /
			        pkg.overprovision_disk);
		}

		if (!isFinite(requestedDisk)) {
			servers.forEach(function (server) {
				reasons[server.uuid] =
				    'VM\'s disk size could not be determined';
			});
			return (cb(null, [], reasons));
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

/*
 * Returns the MiB an HVM instance needs for its zvols and zone root, or NaN
 * if that cannot be determined. The zvols are sized from flexible_disk_size or
 * the requested disks when given, and otherwise from the legacy layout where
 * image_size applies to disk[0] and pkg.quota to disk[1].
 */
function
hvmRequestedDisk(vm, img, pkg)
{
	var disks = hvmDisks.requestedDisksSize(vm, img.image_size);

	if (disks === null)
		disks = ((pkg && pkg.quota) || 0) + img.image_size;

	return (disks + hvmDisks.rootQuota(vm) * 1024);
}

module.exports = {
	name: 'Servers with enough unreserved disk',
	run: filterMinDisk
};
