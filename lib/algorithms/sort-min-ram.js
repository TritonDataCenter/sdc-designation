/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Sorts servers by reverse order of amount of unreserved RAM. Returns result
 * ordered by preference (first being highest).
 */



function sortMinUnreservedRam(log, state, servers) {
    // shallow copy to avoid mutating order of referred array
    servers = servers.slice(0);

    servers.sort(function (a, b) {
        return b.unreserved_ram - a.unreserved_ram;
    }).reverse();

    return [servers];
}



module.exports = {
    name: 'Sort servers by minimum unreserved RAM',
    run: sortMinUnreservedRam,
    affectsCapacity: false
};
