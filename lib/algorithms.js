/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given the algorithms.
 */



var state = {};



function allocate(log, algorithms, servers, ram, vlans) {
    for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];
        var localState = state[algorithm.name];

        if (!localState) {
           localState = state[algorithm.name] = {};
        }

        servers = algorithm.run(log, localState, servers, ram, vlans);

        if (log.debug()) {
            var serverUuids = servers.map(function (server) {
                return server.uuid;
            });
            log.debug({serverUuids: serverUuids}, '%s returned %d server(s)',
                algorithm.name, serverUuids.length);
        }
    }

    return servers[0];
}



module.exports = {
    allocate: allocate
};
