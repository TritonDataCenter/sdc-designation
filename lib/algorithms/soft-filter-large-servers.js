/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * This splits servers into two pools: one pool is used to fulfill requests for
 * zones with little RAM, while the other pool is used for large zones. Since
 * most allocations are small (for some definition of "small"), most servers
 * are put in the pool for small allocations.
 *
 * The purpose here is to keep a few servers around with enough free space to
 * satisfy large allocations -- such allocations are uncommon but valuable.
 */



// by default, 15% of servers are kept for large allocations
var LARGE_POOL_RATIO = 0.15;

// an allocation must be larger than 32 GiB to go in the large pool
var MIN_RAM_FOR_LARGE_POOL = 32768 - 1; // in MiB, - 1 to be safe



function filterLargeServers(log, state, servers, requestedRam) {
    var largePoolSize = servers.length * LARGE_POOL_RATIO;
    if (largePoolSize < 1)
        return servers;

    var sortedServers = servers.sort(function (a, b) {
        return a.memory_available_bytes - b.memory_available_bytes;
    });

    if (requestedRam > MIN_RAM_FOR_LARGE_POOL) {
        var pool = sortedServers.slice(0, largePoolSize);
    } else {
        pool = sortedServers.slice(largePoolSize, servers.length);
    }

    return pool;
}



module.exports = {
    name: 'Separate some servers as pool for large requests',
    run: filterLargeServers
};
