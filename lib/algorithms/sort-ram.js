/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Sorts servers by amount of unreserved RAM. Returns result ordered by
 * preference (first being highest).
 */



function sortUnreservedRam(log, state, servers) {
    // shallow copy to avoid mutating order of referred array
    servers = servers.slice(0);

    servers.sort(function (a, b) {
        return b.unreserved_ram - a.unreserved_ram;
    });

    return servers;
}



module.exports = {
    name: 'Sort servers by unreserved RAM',
    run: sortUnreservedRam
};
