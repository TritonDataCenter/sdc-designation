/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * Increases the scores of servers based on the amount of unreserved disk
 * available.
 *
 * The range of scores that can be added to servers is determined by
 * weight_unreserved_disk (between 0 and abs(weight)). A positive
 * weight_unreserved_disk will cause servers which have more free disk
 * (specifically, disk which has not already been reserved for use by existing
 * zones) to receive higher scores. A negative weight_unreserved_disk does the
 * opposite: servers which have more unreserved disk have lower score increases.
 *
 * Scoring is affected by server_spread in the defaults (deprecated), as well as
 * alloc_server_spread in the package. If they are set, this plugin doesn't
 * change any scores.
 */

var score = require('../scorers').linear;


function
scoreUnreservedDisk(log, servers, constraints)
{
	var reasons = {};

	// if any pkg or default server_spread attributes set, we return
	// immediately, since unreserved_disk was never supported for any of
	// them
	var serverSpread = (constraints.pkg &&
		constraints.pkg.alloc_server_spread ||
		constraints.defaults.server_spread);
	if (serverSpread) {
		reasons.skip = 'pkg or default set to spread with: ' +
			serverSpread;
		return ([servers, reasons]);
	}

	var weight = +constraints.defaults.weight_unreserved_disk;
	if (weight === 0) {
		reasons.skip = 'Resolved score weight to 0.00; no changes';
		return ([servers, reasons]);
	}

	// shallow copy to avoid mutating order of referred array
	var sortedServers = servers.slice(0).sort(function (a, b) {
		// we multiply by weight here in order to make weight's sign
		// (negative, positive number) have an effect -- whether the
		// sorting is reversed or not
		return (weight * (a.unreserved_disk - b.unreserved_disk));
	});

	// alter scores; this mutates server objects referred to by both
	// sortedServers and servers
	score(log, sortedServers, Math.abs(weight), reasons);

	return ([servers, reasons]);
}


module.exports = {
	name: 'Score servers based on unreserved disk',
	run: scoreUnreservedDisk
};
