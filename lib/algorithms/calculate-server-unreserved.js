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

var assert = require('assert-plus');


var DEFAULT_SERVER_OVERPROVISIONING = { ram: 1.0, disk: 1.0, cpu: 4.0 };
var MB = 1024 * 1024;
var GB = 1024 * MB;
var POOL_USABLE_RATIO = 0.94;


function
calculateServerUnreserved(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.func(cb, 'cb');

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
		 * a server that never overprovisioned RAM or disk
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

		overprovisionCpu = server.overprovision_ratios.cpu || 1;
		overprovisionRam = server.overprovision_ratios.ram || 1;

		vmUuids = Object.keys(vms);

		for (var j = 0; j != vmUuids.length; j++) {
			var vm = vms[vmUuids[j]];
			var cpu = vm.cpu_cap;
			var ram;

			if (cpu) {
				if (vm.state !== 'failed') {
					server.unreserved_cpu -=
					    cpu / overprovisionCpu;
				}
			} else {
				server.unreserved_cpu = 0;
			}

			ram = vm.max_physical_memory;
			if (vm.state !== 'failed') {
				if (vm.brand !== 'kvm')
					ram /= overprovisionRam;

				server.unreserved_ram -= ram;
			}
		}

		server.unreserved_cpu = Math.floor(server.unreserved_cpu);
		server.unreserved_ram = Math.floor(server.unreserved_ram);
	});

	return (cb(null, servers, {}));
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

/*
 * Calculating disk usage on a CN is a bit involved. We cannot simply look at
 * the free space on disk since much of that free space is reserved for existing
 * zones, even when that space has not yet been used.
 *
 * We also need to treat zone quotas and KVM quotas differently when dealing
 * with overprovisioning. First, ZFS volumes are fundamentally different from
 * ZFS filesystems, being opaque blobs of data which are typically
 * unreclaimable as long as a KVM instances lives. More importantly, the OSes
 * inside KVM usually don't react well when their virtual disks -- which appear
 * to have free space -- suddenly cannot accept writes when the underlying
 * volume cannot get space it was promised; this can lead to the inner OS
 * corrupting its filesystem stored in that volume.
 *
 * The failure modes of disks (in general, not just KVM's volumes) are generally
 * more troublesome than RAM or CPU. If there isn't enough CPU, processes take
 * longer. If there isn't enough RAM, more paging will usually occur. If there
 * isn't enough disk, most of the time things go bang.
 *
 * The following function effectively calculates the following:
 *    usable pool size - system usage - image usage - cores usage - KVM quotas -
 *    ((zone quotas - zone usage) * (1 - 1 / disk overprovision ratio))
 *
 * Note the important distinction between usage and quota: usage are the bytes
 * actually used in a dataset (and roughly on disk), while quota is both the
 * maximum disk space a zone can use, and is also how much space was promised
 * to that zone. Quotas will almost always be larger than usage.
 */
function
calcUnreservedDisk(server)
{
	/*
	 * POOL_USABLE_RATIO is needed because the pool size is larger than
	 * what we see in the datasets due to metadata overhead. Furthermore,
	 * unlike many filesystems, ZFS allocates most metadata dynamically.
	 * In short, it is difficult know exactly how much space is really
	 * available beforehand. In practice, the overhead is small (3-5%) for
	 * typical setups; we use POOL_USABLE_RATIO as a fudge factor for this.
	 */
	var unreserved = server.disk_pool_size_bytes * POOL_USABLE_RATIO -
	    server.disk_system_used_bytes -
	    server.disk_installed_images_used_bytes -
	    server.disk_cores_quota_used_bytes;

	/*
	 * We have to do some hackery here.  Normally
	 * server.disk_kvm_quota_bytes is enough (rather than the whole
	 * rigamole for kvmQuotaBytes), but KVM quotas have been
	 * misapplied in production, so we work around that for the
	 * time being.
	 */
	var kvmQuotaBytes = server.disk_kvm_zvol_volsize_bytes +
	    numKvms(server.vms) * 10 * GB;
	unreserved -= kvmQuotaBytes;

	/*
	 * Originally we used disk_zone_quota_bytes alone, but this causes some
	 * capacity problems with overprovisioning since the actual disk used
	 * (not just promised) isn't considered:
	 *
	 * - Excess spare disk capacity when overprovisioning on some CNs in a
	 * busy DC. In typical workloads, many CNs will end up with much of the
	 * pool unused, because zones rarely fill up their quota.
	 * - It makes ENOSPC (no disk space) errors more likely with
	 * overprovisioning higher than 1, since it will still blindly place
	 * zones on a CN despite that CN's pool being almost full.
	 *
	 * By applying overprovisioning solely to the chunk of zone quotas that
	 * haven't been used (i.e. we add some information about actual disk
	 * usage by the zones), we reduce these problems. E.g. zones that have a
	 * total quota of 1000GB, where only 600GB have been used, have 400GB
	 * free. That 400GB portion is what we apply overprovisioning
	 * calculations to.
	 *
	 * The trade-off here is that greedy consumers can more easily get away
	 * with using their total quota. E.g. they may be paying for a class of
	 * package that only guarantees 1/2 their quota to them (with an
	 * overprovision_disk of 2), but by filling up their quota fast they
	 * can usually get close to the total quota (as if they had an
	 * overprovision_disk of 1).
	 */
	var overprovisionDisk = server.overprovision_ratios.disk || 1;
	var zoneQuotaFree = server.disk_zone_quota_bytes -
		server.disk_zone_quota_used_bytes;
	unreserved -= server.disk_zone_quota_used_bytes +
		zoneQuotaFree/overprovisionDisk;

	/*
	 * A last sanity check: if unreserved is larger than the free space in
	 * the pool, use the free pool space instead.
	 */
	var poolFree = server.disk_pool_size_bytes * POOL_USABLE_RATIO -
	    server.disk_pool_alloc_bytes;
	unreserved = Math.min(unreserved, poolFree);

	unreserved /= MB;

	return (Math.floor(unreserved));
}

module.exports = {
	name: 'Calculate unreserved resources on each server',
	run: calculateServerUnreserved
};
