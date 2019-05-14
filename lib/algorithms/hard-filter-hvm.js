/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2019 Joyent, Inc.
 */

/*
 * This filter will:
 *
 *	* prevent brand=bhyve VMs from being provisioned to servers that don't
 *	  have 'Bhyve Capable' set to true in their sysinfo.
 *	* prevent brand=bhyve VMs from being provisioned to servers that have
 *	  existing kvm VMs (or vice versa) if 'HVM API' is not set.
 *	* prevent brand=bhyve VMs from being provisioned to servers that don't
 *	  support the requested number of vcpus.
 *
 * Note that calculate-ticketed-vms.js will have added in-flight VMs to the
 * server.vms arrays, so we will also refuse to provision bhyve to a system that
 * has an in-progress kvm provision, and vice versa, if 'HVM API' is not set.
 */

var assert = require('assert-plus');

var HVM_BRANDS = ['bhyve', 'kvm'];


function filterHVM(servers, opts, cb) {
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.string(opts.vm.brand, 'opts.vm.brand');
	assert.optionalNumber(opts.vm.vcpus, 'opts.vm.vcpus');
	assert.func(cb, 'cb');

	var adequateServers = servers;
	var reasons = {};
	var newVmBrand = opts.vm.brand;
	var newVmVcpus = opts.vm.vcpus;

	if (HVM_BRANDS.indexOf(newVmBrand) === -1) {
		// We don't care about VMs with brands that are not HVM
		return (cb(null, servers, reasons));
	}

	// The assert above verifies that if this is passed, it's a number
	// so this ensures it's not 0, undefined or null.
	if (!newVmVcpus) {
		// set to -1 to make it more obvious something was wrong
		newVmVcpus = -1;
	}

	adequateServers = servers.filter(function checkServer(server) {
		var bhyveMaxVcpus;
		var bhyveSupport;
		var serverTotalCpus;
		var sysinfo = server.sysinfo;
		var vms = server.vms;
		var vmNames = Object.keys(vms);

		bhyveMaxVcpus = Number(sysinfo['Bhyve Max Vcpus']);
		bhyveSupport = sysinfo['Bhyve Capable'];
		serverTotalCpus = Number(sysinfo['CPU Total Cores']);
		if (sysinfo.hasOwnProperty('CPU Online Count'))
			serverTotalCpus = Number(sysinfo['CPU Online Count']);

		// Older builds did not have 'Bhyve Max Vcpus', and the max
		// there was 16
		if (isNaN(bhyveMaxVcpus)) {
			bhyveMaxVcpus = 16;
		}

		// Even if bhyve supports more vcpus, the system might not
		// *have* that many online CPUs. If so, we'll reduce max.
		if (serverTotalCpus < bhyveMaxVcpus) {
			bhyveMaxVcpus = serverTotalCpus;
		}

		if (newVmBrand === 'bhyve' && bhyveSupport !== true) {
			reasons[server.uuid] =
			    'Server does not support "bhyve" VMs';
			return (false);
		}

		// Ensure the server has the correct number of cores for VM's
		// vcpus
		if (newVmBrand === 'bhyve') {
			if (newVmVcpus < 1 || newVmVcpus > bhyveMaxVcpus) {
				reasons[server.uuid] = 'bhyve VM ' +
				    opts.vm.uuid +
				    ' is requesting ' + newVmVcpus + ' vcpus ' +
				    'whereas server supports 1 - ' +
				    bhyveMaxVcpus + ' vcpus';
				return (false);
			}
		}

		// CNs with 'HVM API' are capable of running different HVMs
		// at the same time without conflict
		if (sysinfo['HVM API']) {
			return (true);
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
