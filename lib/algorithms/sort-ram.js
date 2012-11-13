/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Sorts servers by amount of free RAM. Returns result ordered by preference
 * (first being highest).
 */



function sortAvailableRam(log, state, servers) {
    var sortedServers = servers.sort(function (a, b) {
        return b.memory_available_bytes - a.memory_available_bytes;
    });

    return sortedServers;
}



module.exports = {
    name: 'Sort servers by available RAM',
    run: sortAvailableRam
};
