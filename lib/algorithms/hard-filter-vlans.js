/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/*
 * Returns servers which have all the required NIC Tags.
 *
 * Servers have NIC "tags" attached to each NIC, which is visible in that
 * server's sysinfo. Tags are a means of telling whether certain networks are
 * accessible on a NIC. When a server is requested from DAPI, a set of tag
 * requirements is provided, which DAPI then attempts to match against the union
 * of all tags present on a server's NICs.
 *
 * The requirements are expressed as an array of each network or pool's NIC tag
 * options. While a network can only be on a single NIC tag, and will therefore
 * only ever have an array with a single possibility, a network pool may contain
 * networks on different tags, and will therefore provide several alternative
 * choices.
 *
 * As an example, consider an attempt to provision on a network and two pools.
 * In such a scenario, we might receive the following "nic_tag_requirements":
 *
 * [
 *   [ "sdc_overlay" ],
 *   [ "r1external", "r2external", "r3external" ],
 *   [ "r1internal", "r2internal", "r3internal" ]
 * ]
 *
 * And we might have the following choices for servers:
 *
 * Server 1: admin, r1external, r1internal, sdc_underlay, sdc_overlay
 * Server 2: admin, r1external, r1internal
 * Server 3: admin, r2external, r2internal
 * Server 4: admin, r3external, r3internal, sdc_underlay, sdc_overlay
 *
 * In this scenario, Servers 2 & 3 are rejected, since they don't meet our
 * "sdc_overlay" requirement. Servers 1 & 2 are kept though, since 1 is able to
 * meet the r1external and r1internal requirements, and 2 is able to meet the
 * r2external and r2internal requirements.
 *
 * In short, if a server doesn't meet the provided tag requirements, then the
 * the VM being allocated would not be able to reach all requested networks or
 * any of the networks in a requested pool. The server is therefore dropped from
 * further consideration.
 */

var assert = require('assert-plus');
var mod_util = require('util');

function filterTags(servers, opts, cb) {
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.func(cb, 'cb');

	var requestedTags = null;
	var reasons = {};
	var adequateServers;

	if (opts.vm.nic_tag_requirements) {
		requestedTags = opts.vm.nic_tag_requirements;
	} else if (opts.vm.nic_tags) {
		requestedTags = opts.vm.nic_tags.map(function (nic_tag) {
			return ([ nic_tag ]);
		});
	}

	if (requestedTags === null) {
		reasons.skip = 'No NIC Tag requirements to filter on';
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
		onlineTags  = tags.online;
		offlineTags = tags.offline;

		for (var i = 0; i < requestedTags.length; i++) {
			var reqs = requestedTags[i];
			var satisfiedOnline = false;
			var satisfiedOffline = null;

			for (var j = 0; j < reqs.length; j++) {
				var tag = reqs[j];
				if (onlineTags[tag]) {
					satisfiedOnline = true;
					break;
				} else if (offlineTags[tag]) {
					satisfiedOffline = tag;
				}
			}

			if (satisfiedOnline) {
				continue;
			} else if (satisfiedOffline !== null) {
				var nic = offlineTags[tag];
				reasons[server.uuid] = mod_util.format(
				    'NIC %s for tag "%s" is %s',
				    nic.interface, tag, nic['Link Status']);
				return (false);
			} else {
				reasons[server.uuid] =
				    'Server must have one of the NIC Tags: ' +
				    reqs.join(', ');
				return (false);
			}
		}

		return (true);
	});

	return (cb(null, adequateServers, reasons));
}

function getTags(interfaces, vnics) {
	assert.object(interfaces, 'interfaces');
	assert.object(vnics, 'vnics');

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

	return {
		online: onlineTags,
		offline: offlineTags
	};
}

module.exports = {
	name: 'Servers supporting required NIC Tags',
	run: filterTags
};
