/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2018, Joyent, Inc.
 */

/*
 * This filter will:
 *
 *	* prevent brand=bhyve VMs from being provisioned to servers that don't
 *	  have 'Bhyve Capable' set to true in their sysinfo.
 *	* prevent brand=bhyve VMs from being provisioned to servers that have
 *	  existing kvm VMs.
 *	* prevent brand=kvm VMs from being provisioned to servers that have
 *	  existing bhyve VMs.
 *
 * Note that calculate-ticketed-vms.js will have added in-flight VMs to the
 * server.vms arrays, so we will also refuse to provision bhyve to a system that
 * has an in-progress kvm provision and vice versa.
 */

var assert = require('assert-plus');

var HVM_BRANDS = ['bhyve', 'kvm'];


function filterHVM(servers, opts, cb) {
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.string(opts.vm.brand, 'opts.vm.brand');
	assert.func(cb, 'cb');

	var adequateServers;
	var reasons = {};
	var newVmBrand = opts.vm.brand;

	if (HVM_BRANDS.indexOf(newVmBrand) === -1) {
		// We don't care about VMs with brands that are not HVM
		return (cb(null, servers, reasons));
	}

	adequateServers = servers.filter(function checkServer(server) {
		var bhyveSupport = server.sysinfo['Bhyve Capable'];
		var vms = server.vms;
		var vmNames = Object.keys(vms);

		if (newVmBrand === 'bhyve' && bhyveSupport !== true) {
			reasons[server.uuid] =
			    'Server does not support "bhyve" VMs';
			return (false);
		}

		for (var i = 0; i !== vmNames.length; i++) {
			var vm = vms[vmNames[i]];

			if (HVM_BRANDS.indexOf(vm.brand) === -1) {
				// Brands other than these won't conflict
				continue;
			}

			if (vm.brand !== newVmBrand) {
				reasons[server.uuid] = 'VM ' + vm.uuid +
				    ' has brand ' + vm.brand + ' which ' +
				    'is incompatible with new VMs using ' +
				    'brand ' + newVmBrand;
				return (false);
			}
		}

		return (true);
	});

	return (cb(null, adequateServers, reasons));
}

module.exports = {
	name: 'Servers which are capable of requested virtualization',
	run: filterHVM
};
