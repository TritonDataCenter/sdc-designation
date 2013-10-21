/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers which are not in the reservoir.
 */



function filterReservoir(log, state, servers) {
    var adequateServers = servers.filter(function (server) {
        return !server.reservoir;
    });

    return [adequateServers];
}



module.exports = {
    name: 'Servers which are not in the reservoir',
    run: filterReservoir,
    affectsCapacity: true
};
