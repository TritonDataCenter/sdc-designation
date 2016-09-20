/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers which have all the required VLANs.
 *
 * Servers have NIC "tags" attached to each NIC, which is visible in that
 * server's sysinfo. Tags are a means of telling whether certain networks are
 * accessible on a NIC. When a server is requested from DAPI, a set of tags are
 * provided, which DAPI then attempts to match against the union of all tags
 * present on a server's NICs.
 *
 * In short, if a server doesn't have all the requested tags on one or more of
 * its NICs, that means it cannot reach all the networks that the new VM being
 * allocated must be able to reach, thus the server is dropped from further
 * consideration.
 */

var assert = require('assert-plus');

function
filterVlans(log, servers, constraints, cb)
{
	assert.object(log);
	assert.arrayOfObject(servers);
	assert.object(constraints);
	assert.func(cb);

	var requestedVlans = constraints.vm.nic_tags;
	var reasons = {};
	var adequateServers;

	if (!requestedVlans) {
		reasons.skip = 'No nic_tags to filter on';
		return (cb(null, servers, reasons));
	}

	adequateServers = servers.filter(function (server) {
		var interfaces = server.sysinfo['Network Interfaces'];
		var vnics = server.sysinfo['Virtual Network Interfaces'] || {};
		var tags;
		var onlineTags;
		var offlineTags;

		if (!interfaces) {
			reasons[server.uuid] =
				'Server missing interfaces in sysinfo';

			return (false);
		}

		tags = getTags(interfaces, vnics);
		onlineTags  = tags[0];
		offlineTags = tags[1];

		/* jsl: ignore (bogus unreachable warning) */
		for (var i = 0; i !== requestedVlans.length; i++) {
		/* jsl: end */
			var tag = requestedVlans[i];

			if (onlineTags[tag])
				continue;

			if (offlineTags[tag]) {
				var nic = offlineTags[tag];

				reasons[server.uuid] = 'NIC ' + nic.interface +
					' for tag "' + tag + '" is ' +
					nic['Link Status'];
			} else {
				reasons[server.uuid] =
				    'Server missing vlan "' + tag + '"';
			}

			return (false);
		}

		return (true);
	});

	return (cb(null, adequateServers, reasons));
}

function
getTags(interfaces, vnics)
{
	var onlineTags = {};
	var offlineTags = {};

	Object.keys(interfaces).forEach(function (nicName) {
		var nic = interfaces[nicName];
		var nicStatus = nic['Link Status'];
		var nicTags   = nic['NIC Names'];
		var tagIndex;

		nic.interface = nicName;

		tagIndex = (nicStatus === 'up' ? onlineTags : offlineTags);

		for (var i = 0; i !== nicTags.length; i++) {
			tagIndex[nicTags[i]] = nic;
		}
	});

	Object.keys(vnics).forEach(function (nicName) {
		var nic = vnics[nicName];
		var nicStatus = nic['Link Status'];
		var nicTags   = nic['Overlay Nic Tags'] || [];
		var tagIndex;

		nic.interface = nicName;

		tagIndex = (nicStatus === 'up' ? onlineTags : offlineTags);

		for (var i = 0; i !== nicTags.length; i++) {
			tagIndex[nicTags[i]] = nic;
		}
	});

	return ([onlineTags, offlineTags]);
}

module.exports = {
	name: 'Servers supporting required VLANs',
	run: filterVlans
};
