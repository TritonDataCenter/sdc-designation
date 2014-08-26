/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns a server randomly chosen from the first 5% given servers.
 * This assumes that the servers have already been sorted in descending order
 * of preference.
 *
 * The purpose of this plugin is to help mitigate collisions caused by
 * concurrent requests, e.g. five 8GiB VMs are requested at the same time,
 * thus are likely to be allocated to the same server without randomization.
 */

var SERVER_SELECTION_RANGE = 0.05;

/*
 * Randomly pick one of the top 20% servers if there's enough servers, otherwise
 * returns top choice.
 */
function
pickRandomWeightedServer(log, state, servers)
{
	var range;
	var index;
	var server;

	if (servers.length === 0)
		return ([[]]);

	range = Math.floor(servers.length * SERVER_SELECTION_RANGE);
	if (range < 1) {
		log.trace('Too few servers for random selection; ' +
		    'returning top choice');
		return ([[servers[0]]]);
	}

	servers = servers.slice(0, range);

	index = Math.floor(Math.random() * servers.length);
	server = servers[index];

	return ([[server]]);
}

module.exports = {
	name: 'Random weighted server',
	run: pickRandomWeightedServer,
	affectsCapacity: false
};
