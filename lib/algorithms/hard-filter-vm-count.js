/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers which have fewer than a fixed limit of VMs.
 *
 * By default, this plugin filters out servers with equal or more than
 * DEFAULT_VM_LIMIT VMs on it. However, if "filter_vm_limit" is set in the
 * constraint defaults, servers which have equal or more than than attribute's
 * number of VMs will be removed.
 */

/* Default maximum number of VMs that can occupy a single server */
var DEFAULT_VM_LIMIT = 224;

function
filterVmCount(log, servers, constraints)
{
	var vmLimit = +constraints.defaults.filter_vm_limit || DEFAULT_VM_LIMIT;
	var reasons = {};

	log.trace('Filtering servers with more than', vmLimit, 'VMs');

	var adequateServers = servers.filter(function (server) {
		var numVms = Object.keys(server.vms).length;

		if (numVms >= vmLimit) {
			var msg = 'Server has ' + numVms + ' VMs (limit is ' +
				vmLimit + ')';
			log.trace('Skipping server', server.uuid, 'because',
				msg);

			reasons[server.uuid] = msg;

			return (false);
		}

		return (true);
	});

	return ([adequateServers, reasons]);
}

module.exports = {
	name: 'Servers with more VMs than limit',
	run: filterVmCount
};
