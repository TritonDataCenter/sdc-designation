/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Appends VMs that have provisioning tickets, if those VMs have not yet
 * appeared on a server if those VMs have not yet appeared in the CNAPI input
 * being fed to DAPI.
 *
 * When a VM is created, it does not appear in CNAPI immediately. However,
 * metadata about the dimensions of VMs which are currently being provisioned
 * can be used in lieu of that. This plugin takes that metadata and adds VMs
 * to the CNAPI input, before further processing. As a result, this plugin needs
 * to be near the beginning of the chain.
 */

var assert = require('assert-plus');


var GiB = 1024 * 1024 * 1024;


function
addTicketedVms(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.func(cb, 'cb');

	var serversWithOpenTickets = findOpenTickets(opts.tickets);

	servers = servers.filter(function (server) {
		var tickets = serversWithOpenTickets[server.uuid];
		var vms = server.vms;

		if (!tickets)
			return (true);

		if (!vms)
			vms = server.vms = {};  // playing safe

		for (var i = 0; i !== tickets.length; i++) {
			var ticket = tickets[i];

			if (!ticket.extra) // old version of vmapi/cnapi
				return (false);

			// if VM has already appeared in CNAPI output, we
			// don't need to do anything
			if (vms[ticket.id])
				continue;

			var vm = createVm(ticket);
			vms[ticket.id] = vm;

			server.disk_zone_quota_bytes += vm.quota * GiB;

			if (vm.brand === 'kvm') {
				server.disk_kvm_zvol_volsize_bytes +=
					vm.zvol_quota * GiB;

				delete vm.zvol_quota;
			}
		}

		return (true);
	});

	return (cb(null, servers, {}));
}

function
findOpenTickets(tickets)
{
	var serverTickets = {};

	tickets.forEach(function (t) {
		if (t.scope === 'vm' && t.action === 'provision' &&
		    (t.status === 'queued' || t.status === 'active')) {

			var sUuid = t.server_uuid;
			serverTickets[sUuid] = serverTickets[sUuid] || [];
			serverTickets[sUuid].push(t);
		}
	});

	return (serverTickets);
}

function
createVm(ticket)
{
	var meta = ticket.extra;

	var vm = {
		uuid: ticket.id,
		owner_uuid: meta.owner_uuid,
		max_physical_memory: meta.max_physical_memory,
		cpu_cap: meta.cpu_cap,
		quota: meta.quota,
		brand: meta.brand,
		zone_state: 'running',
		state: 'running'
	};

	if (vm.brand === 'kvm') {
		vm.max_physical_memory += 1024;
		vm.zvol_quota = 0;

		if (meta.disks) {
			var zvolQuota = 0;

			meta.disks.forEach(function (disk) {
				zvolQuota += disk.size || 0;
			});

			// convert from MiB to GiB
			vm.zvol_quota = Math.ceil(zvolQuota / 1024);
		}
	}

	return (vm);
}

module.exports = {
	name: 'Add VMs which have open provisioning tickets',
	run: addTicketedVms
};
