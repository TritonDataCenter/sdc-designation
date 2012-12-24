/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with a "running" status.
 */



function filterRunning(log, state, servers) {
    var adequateServers = servers.filter(function (server) {
        return server.status === 'running';
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers which are currently running',
    run: filterRunning
};
