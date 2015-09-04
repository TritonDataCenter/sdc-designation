/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Computes what the unreserved CPU, RAM and disk on each server is. Several
 * plugins depend on this one being run first in order to provide them the
 * needed summaries.
 *
 * This makes the crucial assumption that all VMs on a server have the same
 * overprovision ratios (see the hard-filter-overprovision-ratios.js top comment
 * for why this assumption should be true).
 *
 * We assume here that a VM missing a cpu_cap or quota (these are optional)
 * completely fill up a server since we cannot guarantee they won't use all the
 * space. Obviously, you don't want too many of these floating around.
 *
 * Be aware that by default, and historically, servers were treated as if they
 * had an overprovision_ratios of { ram: 1.0 } -- this means that RAM isn't
 * overprovisioned, and DAPI ignores whether other resources are being
 * overprovisioned.
 *
 * If a server doesn't have an overprovision_ratio for a resource, we assume
 * that existing VMs on the server take no space for that resource since we're
 * disregarding it.
 */

var DEFAULT_SERVER_OVERPROVISIONING = { ram: 1.0 };
var MB = 1024 * 1024;
var GB = 1024 * MB;

function calculateServerUnreserved(log, state, servers) {
	servers.forEach(function (server) {
		var vms;
		var overprovisionCpu;
		var overprovisionRam;
		var vmUuids;

		if (!server.sysinfo) {
			server.unreserved_cpu  = 0;
			server.unreserved_ram  = 0;
			server.unreserved_disk = 0;
			return;
		}

		/*
		 * A server that has no overprovision ratios is treated like
		 * a server that never overprovisions RAM
		 */
		server.overprovision_ratios = server.overprovision_ratios ||
		    DEFAULT_SERVER_OVERPROVISIONING;

		/* also convert to MiB and cpu_cap units */
		server.unreserved_cpu = server.sysinfo['CPU Total Cores'] * 100;
		server.unreserved_ram = server.memory_total_bytes / MB *
		    (1 - server.reservation_ratio);
		server.unreserved_disk = calcUnreservedDisk(server);

		vms = server.vms;
		if (!vms)
			return;

		overprovisionCpu = server.overprovision_ratios.cpu;
		overprovisionRam = server.overprovision_ratios.ram;

		vmUuids = Object.keys(vms);

		for (var j = 0; j != vmUuids.length; j++) {
			var vm = vms[vmUuids[j]];
			var cpu = vm.cpu_cap;
			var ram;

			if (cpu) {
				if (overprovisionCpu && vm.state !== 'failed') {
					server.unreserved_cpu -=
					    cpu / overprovisionCpu;
				}
			} else {
				server.unreserved_cpu = 0;
			}

			ram = vm.max_physical_memory;
			if (overprovisionRam && vm.state !== 'failed') {
				if (vm.brand !== 'kvm')
					ram /= overprovisionRam;

				server.unreserved_ram -= ram;
			}
		}

		server.unreserved_cpu = Math.floor(server.unreserved_cpu);
		server.unreserved_ram = Math.floor(server.unreserved_ram);
	});

	return ([servers]);
}

function
numKvms(vms)
{
	var kvmCount = 0;
	var vmUuids = Object.keys(vms);

	for (var i = 0; i !== vmUuids.length; i++) {
		var vm = vms[vmUuids[i]];

		if (vm.brand === 'kvm')
			kvmCount++;
	}

	return (kvmCount);
}

function
calcUnreservedDisk(server)
{
	var unreserved = server.disk_pool_size_bytes -
	    server.disk_installed_images_used_bytes -
	    server.disk_cores_quota_used_bytes;

	var overprovisionDisk = server.overprovision_ratios.disk;

	if (overprovisionDisk) {
		/*
		 * We have to do some hackery here.  Normally
		 * server.disk_kvm_quota_bytes is enough (rather than the whole
		 * rigamole for kvmQuotaBytes), but KVM quotas have been
		 * misapplied in production, so we work around that for the
		 * time being.
		 */
		var kvmQuotaBytes = server.disk_kvm_zvol_volsize_bytes +
		    numKvms(server.vms) * 10 * GB;

		unreserved -= server.disk_zone_quota_bytes / overprovisionDisk +
			kvmQuotaBytes;
	}

	unreserved /= MB;

	return (Math.floor(unreserved));
}

module.exports = {
	name: 'Calculate unreserved resources on each server',
	run: calculateServerUnreserved,
	affectsCapacity: true
};
