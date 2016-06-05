/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * This plugin filters out the 15% largest and most empty servers and returns
 * the rest.
 *
 * The purpose here is to keep a few servers around with enough unreserved space
 * to satisfy large allocations -- such allocations are uncommon but valuable.
 */

/* by default, 15% of servers are kept for large allocations */
var LARGE_POOL_RATIO = 0.15;

function
filterLargeServers(log, servers, constraints)
{
	var pool;
	var largePoolSize = servers.length * LARGE_POOL_RATIO;
	var override = constraints.defaults.filter_large_servers;

	if (typeof (override) !== 'undefined' && !override)
		return ([servers]);

	if (largePoolSize < 1)
		return ([servers]);

	/* shallow copy to avoid mutating order of referred array */
	servers = servers.slice(0);

	servers.sort(function (a, b) {
		return (b.unreserved_ram - a.unreserved_ram);
	});

	pool = servers.slice(largePoolSize, servers.length);

	return ([pool]);
}

module.exports = {
	name: 'Filter out the largest and most empty servers',
	run: filterLargeServers
};
