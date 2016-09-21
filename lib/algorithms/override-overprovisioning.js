/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * This strips any overprovisioning attributes and sets them all to the
 * hardcoded defaults.
 *
 * The default values are sane for most workloads, and should cause no serious
 * problems. However, it's possible to override what the default ratios for
 * all packages and servers, or disable overriding altogether.
 *
 * Overriding individual attributes is potentially risky -- especially with KVM
 * instances, which won't respond well if they can't get the RAM they need
 * (won't boot), and _especially_ with disk, which can potentially lead to
 * filesystem corruption for the OS inside the KVM. CPU is a safer knob to
 * fiddle with.
 *
 * Disabling overprovisioning altogther only works with a SDC standup that has
 * had its servers and package overprovision ratios set up perfectly. Only do
 * this after heavily testing this in an internal environment, otherwise
 * surprising things that are a pain to clean up will likely happen.
 */

var assert = require('assert-plus');

// Default overprovision ratios.
var DEFAULT_CPU  = 4;
var DEFAULT_RAM  = 1;
var DEFAULT_DISK = 1;

function
overrideOverprovisioning(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.defaults, 'opts.defaults');
	assert.func(cb, 'cb');

	var reasons = {};
	var defaults = opts.defaults;

	if (defaults.disable_override_overprovisioning) {
		reasons.skip = 'Do not override overprovisioning numbers';
		return (cb(null, servers, reasons));
	}

	var cpuRatio  = +defaults.overprovision_ratio_cpu || DEFAULT_CPU;
	var ramRatio  = +defaults.overprovision_ratio_ram || DEFAULT_RAM;
	var diskRatio = +defaults.overprovision_ratio_disk || DEFAULT_DISK;

	var serverRatios = {
		cpu:  cpuRatio,
		ram:  ramRatio,
		disk: diskRatio
	};

	servers.forEach(function (server) {
		server.overprovision_ratios = serverRatios;
	});

	var pkg = opts.pkg;

	if (pkg) {
		pkg.overprovision_cpu = cpuRatio;
		pkg.overprovision_ram = ramRatio;
		pkg.overprovision_disk = diskRatio;
		delete pkg.overprovision_net;
		delete pkg.overprovision_io;
	}

	return (cb(null, servers, reasons));
}

module.exports = {
	name: 'Force overprovisioning to fixed values',
	run: overrideOverprovisioning
};
