/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * Increases the scores on servers based on the number of zones belonging to
 * the owner of the zone currently being allocated.
 *
 * The range of scores that can be added to servers is determined by
 * weight_num_owner_zones (between 0 and abs(weight)). A positive
 * weight_num_owner_zones will cause servers which have fewer zones belonging
 * to the owner of the current allocation to receive higher scores. A negative
 * weight_num_owner_zones does the opposite: servers which have more zones
 * belonging to the current owner receive higher scores increases.
 *
 * Scoring is affected by server_spread in the defaults (deprecated), as well as
 * alloc_server_spread in the package. If they are set to `min-owner`,
 * weight_num_owner_zones is ignored and servers with the fewest zones belonging
 * to the current owner receive an upper score increase of MIN_OWNER_WEIGHT.
 */

var score = require('../scorers').linear;

var MIN_OWNER_WEIGHT = 2;


function
scoreNumOwnerZones(log, servers, constraints)
{
	var ownerUuid = constraints.vm.owner_uuid;
	var reasons = {};

	// backwards compat
	var serverSpread = (constraints.pkg &&
		constraints.pkg.alloc_server_spread ||
		constraints.defaults.server_spread);
	if (serverSpread) {
		if (serverSpread === 'min-owner') {
			var compatWeight = MIN_OWNER_WEIGHT;
		} else {
			reasons.skip = 'pkg or default set to spread with: ' +
				serverSpread;

			return ([servers, reasons]);
		}
	}

	var defaults = constraints.defaults;
	var weight = compatWeight || defaults.weight_num_owner_zones;
	if (!weight) {
		reasons.skip = 'Resolved score weight to 0; no changes';
		return ([servers, reasons]);
	}

	var deltas = {};
	var counts = [];   // [<count>, <server>]
	for (var i = 0; i < servers.length; i++) {
		var server = servers[i];
		var vmUuids = Object.keys(server.vms);
		var count = 0;
		for (var j = 0; j < vmUuids.length; j++) {
			if (server.vms[vmUuids[j]].owner_uuid === ownerUuid) {
				count++;
			}
		}

		deltas[server.uuid] = count;
		counts.push([count, server]);
	}

	counts.sort(function cmp(a, b) {
		// we multiply by weight here in order to make weight's sign
		// (negative, positive number) have an effect -- whether the
		// sorting is reversed or not
		return (weight * (a[0] - b[0]));
	});

	var orderedServers = counts.map(function (zoneCount) {
		return (zoneCount[1]);
	});

	// alter scores; this mutates server objects referred to by both
	// sortedServers and servers
	score(log, orderedServers, Math.abs(weight), reasons);

	// update reasons with number of VMs found per server
	Object.keys(deltas).forEach(function (uuid) {
		reasons[uuid] += '; ' + deltas[uuid] + ' owner zones found';
	});

	return ([servers, reasons]);
}


module.exports = {
	name: 'Score servers based on number of zones belonging to owner',
	run: scoreNumOwnerZones
};
