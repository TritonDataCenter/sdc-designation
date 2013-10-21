/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with a "running" status.
 */



function filterRunning(log, state, servers, constraints) {
    var reasons = constraints.capacity ? null : {};

    var adequateServers = servers.filter(function (server) {
        if (server.status === 'running')
            return true;

        if (reasons)
            reasons[server.uuid] = 'Server status is ' + server.status;

        return false;
    });

    return [adequateServers, reasons];
}



module.exports = {
    name: 'Servers which are currently running',
    run: filterRunning,
    affectsCapacity: true
};
