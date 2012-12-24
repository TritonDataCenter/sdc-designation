/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Sorts servers by amount of unreserved RAM. Returns result ordered by
 * preference (first being highest).
 */



function sortUnreservedRam(log, state, servers) {
    var sortedServers = servers.sort(function (a, b) {
        return b.unreserved_ram - a.unreserved_ram;
    });

    return sortedServers;
}



module.exports = {
    name: 'Sort servers by unreserved RAM',
    run: sortUnreservedRam
};
