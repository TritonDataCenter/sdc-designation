/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * This splits servers into two pools: one pool is used to fulfill requests for
 * zones with little RAM, while the other pool is used for large zones. Since
 * most allocations are small (for some definition of "small"), most servers
 * are put in the pool for small allocations.
 *
 * The purpose here is to keep a few servers around with enough unreserved space
 * to satisfy large allocations -- such allocations are uncommon but valuable.
 */

/* by default, 15% of servers are kept for large allocations */
var LARGE_POOL_RATIO = 0.15;

/* an allocation must be larger than 32 GiB to go in the large pool */
var MIN_RAM_FOR_LARGE_POOL = 32768 - 1; // in MiB, - 1 to be safe

function
filterLargeServers(log, state, servers, constraints)
{
	var largePoolSize = servers.length * LARGE_POOL_RATIO;
	var pool;

	if (largePoolSize < 1)
		return ([servers]);

	/* shallow copy to avoid mutating order of referred array */
	servers = servers.slice(0);

	servers.sort(function (a, b) {
		return (b.unreserved_ram - a.unreserved_ram);
	});

	if (constraints.vm.ram > MIN_RAM_FOR_LARGE_POOL) {
		pool = servers.slice(0, largePoolSize);
	} else {
		pool = servers.slice(largePoolSize, servers.length);
	}

	return ([pool]);
}

module.exports = {
	name: 'Separate some servers as pool for large requests',
	run: filterLargeServers,
	affectsCapacity: false
};
