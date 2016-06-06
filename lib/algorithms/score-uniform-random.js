/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * Increases scores across servers randomly.
 *
 * Servers are given a random ordering, then their score is increased linearly
 * from 0 to weight_uniform_random.
 *
 * Scoring is also affected by server_spread in the defaults (deprecated), as
 * well as alloc_server_spread in the package. If they are set to `random`,
 * weight_uniform_random is ignored and servers receive random score increases
 * up to RANDOM_WEIGHT.
 */

var score = require('../scorers').linear;

var RANDOM_WEIGHT = 2;


function
scoreUniformRandom(log, servers, constraints)
{
	var reasons = {};

	// backwards compat
	var serverSpread = (constraints.pkg &&
		constraints.pkg.alloc_server_spread ||
		constraints.defaults.server_spread);

	if (serverSpread) {
		if (serverSpread === 'random') {
			var compatWeight = RANDOM_WEIGHT;
		} else {
			reasons.skip = 'pkg or default set to spread with: ' +
				serverSpread;

			return ([servers, reasons]);
		}
	}

	var weight = compatWeight ||
		+constraints.defaults.weight_uniform_random;
	if (!weight) {
		reasons.skip = 'Resolved score weight to 0; no changes';
		return ([servers, reasons]);
	}

	/* shallow copy to avoid mutating order of referred array */
	var sortedServers = servers.slice(0);

	/* Durstenfeld shuffle */
	for (var i = sortedServers.length - 1; i !== 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = sortedServers[i];
		sortedServers[i] = sortedServers[j];
		sortedServers[j] = tmp;
	}

	// alter scores; this mutates server objects referred to by both
	// sortedServers and servers
	score(log, sortedServers, Math.abs(weight), reasons);

	return ([servers, reasons]);
}


module.exports = {
	name: 'Increase server scores randomly',
	run: scoreUniformRandom
};
