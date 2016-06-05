/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Filters out sick servers.
 *
 * Occasionally there are servers which continually fail allocations for
 * one reason or another. Unfortunately, since allocations to that server
 * fail, DAPI keeps thinking there is free space on that server and sending
 * allocations there.
 *
 * This filter uses a very rough heuristic: if a CN has had two consecutive
 * failed allocations on a server in the last 24h, it skips that server.
 */

var DAY_IN_MS = 24 * 60 * 60 * 1000;

function
filterSickServers(log, servers, constraints)
{
	var reasons = {};

	var adequateServers = servers.filter(function (server) {
		var err = isSickServer(server);

		if (err)
			reasons[server.uuid] = err;

		return (!err);
	});

	return ([adequateServers, reasons]);
}

function
isSickServer(server)
{
	var vms = server.vms;
	var dayAgo;
	var newVms;

	if (!vms)
		return (null);

	dayAgo = +new Date() - DAY_IN_MS;

	newVms = Object.keys(vms).map(function (name) {
		return (vms[name]);
	}).filter(function (vm) {
		return (+new Date(vm.last_modified) > dayAgo);
	}).sort(function (a, b) {
		return (a.last_modified < b.last_modified);
	});

	if (newVms.length < 2)
		return (null);

	if (newVms[0].state === 'failed' && newVms[1].state === 'failed') {
		return ('VMs ' + newVms[0].uuid + ' and ' + newVms[1].uuid +
		    ' failed consecutively the past 24h');
	}

	return (null);
}

module.exports = {
	name: 'Servers that had consecutive failed provisions recently',
	run: filterSickServers
};
