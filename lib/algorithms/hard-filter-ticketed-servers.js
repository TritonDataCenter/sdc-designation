/*
 * Copyright (c) 2014, Joyent, Inc. All rights reserved.
 *
 * Filters out servers with unknown provisioning VMs from server selection.
 *
 * One problem we face is several concurrent provisions, because there is a fair
 * likelihood that some of the provisions will land on the same server, and
 * possibly overprovision it.
 *
 * DAPI is typically invoked by a workflow in VMAPI, and fed server and VM data
 * from CNAPI. The problem is that DAPI may have already selected a server for
 * one concurrent provision, but the workflow for that provision is still
 * processing and CNAPI isn't aware of the new VM and its server yet, thus other
 * concurrent provisions won't be aware of the new VM.
 *
 * DAPI used to work around this by using the hackish calculate-recent-vms.js.
 * So long as there is only a single DAPI instance in a DC, that plugin is
 * sufficient. However, if there are multiple DAPI instances, as is the case
 * with a HA CNAPI standup, then remembering recent provisions in a process does
 * not work -- some means is needed to track provisions between several DAPI
 * instances.
 *
 * This is where waitlist tickets come in. CNAPI provides tickets as a means to
 * limit concurrency to a single VM (amongst other things), but can also be used
 * by DAPI to keep track of provisioning VMs which haven't appeared in CNAPI's
 * server listings yet. First, the provision workflow creates a VM provision
 * ticket at start, and cleans up at end. In the middle, this DAPI plugin does
 * its work.
 *
 * What we do here is take a list of open provision tickets, and check whether
 * the ticket's server (the server returned by CNAPI) already contains the
 * provisioning VM. If it does, DAPI won't overprovision on that server (since
 * it's aware of that VM), thus we pass that server on down the pipeline. If the
 * server doesn't contain that VM, then DAPI can unintentionally overprovision
 * on that server, thus we remove the server from further consideration for this
 * allocation.
 *
 * The removal of the server is not ideal. After all, if a 256MiB VM is
 * allocated to an empty 256GiB (NB: GiB, not MiB like the VM) server, then
 * clearly that server should be under consideration for other small concurrent
 * allocations too. Unfortunately, tickets don't currently have any means to
 * pass around metadata -- we need to know the dimensions of a VM somehow --
 * so we take the more brutal approach of removing the server altogether.
 *
 * As long as allocation rates are low, this isn't a problem. If allocation
 * rates become high, we'll need to add metadata to tickets, or find some other
 * approach altogether.
 */

function
filterTickets(log, state, servers, constraints)
{
	var reasons = constraints.capacity ? null : {};
	var tickets = constraints.tickets;
	var serversWithOpenTickets = findOpenTickets(tickets);

	var unprovisioningServers = servers.filter(function (server) {
		var vmUuid = getProvisioningVm(server, serversWithOpenTickets);

		if (vmUuid) {
			if (reasons) {
				var msg = 'Server is currently ' +
				    'provisioning VM ' + vmUuid;
				reasons[server.uuid] = msg;
			}

			return (false);
		}

		return (true);
	});

	return ([unprovisioningServers, reasons]);
}

function
findOpenTickets(tickets)
{
	var serverTickets = {};

	tickets.forEach(function (ticket) {
		if (ticket.scope === 'vm' && ticket.action === 'provision' &&
		    (ticket.status === 'queued' ||
		    ticket.status === 'active')) {

			var serverUuid = ticket.server_uuid;
			serverTickets[serverUuid] =
			    serverTickets[serverUuid] || [];
			serverTickets[serverUuid].push(ticket.id);
		}
	});

	return (serverTickets);
}

function
getProvisioningVm(server, serversWithOpenTickets)
{
	var openTickets = serversWithOpenTickets[server.uuid];
	var vms;

	if (!openTickets)
		return (false);

	vms = server.vms;

	for (var i = 0; i !== openTickets.length; i++) {
		var vmUuid = openTickets[i];

		/*
		 * we're looking for provisioning vms which the server does
		 * not know about yet
		 */
		if (!vms[vmUuid])
			return (vmUuid);
	}

	return (false);
}

module.exports = {
	name: 'Servers which have open provisioning tickets',
	run: filterTickets,
	affectsCapacity: true
};
