/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * If a package has a cpu_cap, filters out all servers with VMs missing cpu_cap.
 * If a package is missing a cpu_cap, filters out all servers with VMs that have
 * a cpu_cap. This is to avoid cap and capless VMs mixing on the same servers,
 * which would violate certain promises made to packages with cpu_cap.
 *
 * Ideally, packages without cpu_caps shouldn't occur in a datacenter, but there
 * are common and useful cases where a cpu_cap can be omitted. The danger then
 * is that VMs with and without a cpu_cap will end up mixed on the same
 * server(s), which will disappoint customers who believe they should be
 * guaranteed at least cpu_cap CPU utilization. The best-practice at the moment
 * is to keep cpu_cap and cpu_cap-less packages on separate servers by using
 * traits, but that's error-prone: if an operator accidentally puts the wrong
 * trait or cap/lessness on a package, it will be a mess to migrate those VMs
 * later on.
 *
 * This plugin serves as a safety. Traits should still be used to determine
 * which servers get which type of package, but if a mistake is made, at least
 * VMs with packages of different types won't be put on the same server(s),
 * making cleanup vastly easier. In some cases, if the operators really know
 * what they're doing and getting into, they can omit the traits practice
 * mentioned above altogether.
 */

function
filterCapness(log, state, servers, constraints)
{
	var reasons = constraints.capacity ? null : {};
	var pkg     = constraints.pkg;

	var pkgCapness = !!(constraints.vm.cpu_cap || (pkg && pkg.cpu_cap));

	var adequateServers = servers.filter(function checkServer(server) {
		var vms = server.vms;
		var vmNames = Object.keys(vms);

		for (var i = 0; i !== vmNames.length; i++) {
			var vm = vms[vmNames[i]];
			var vmCapness = !!vm.cpu_cap;

			if (pkgCapness ^ vmCapness) {
				addReason(reasons, server.uuid, vm, pkgCapness);
				return (false);
			}
		}

		return (true);
	});

	return ([adequateServers, reasons]);
}

function
addReason(reasons, serverUuid, serverVm, pkgCapness)
{
	if (!reasons)
		return;

	var msg = 'VM ' + serverVm.uuid + ' has ' +
		(serverVm.cpu_cap ? 'a' : 'no') +
		' cpu_cap, while the package ' +
		(pkgCapness ? 'does' : 'does not');

	reasons[serverUuid] = msg;
}

module.exports = {
	name: 'Servers which have same existence of cpu_cap as package',
	run: filterCapness,
	affectsCapacity: true
};
