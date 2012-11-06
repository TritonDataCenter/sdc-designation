/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given the algorithms.
 */



var state = {};



function allocate(log, algorithms, servers, ram, vlans) {
    var i = 0;

    for (; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];
        var localState = state[algorithm.name];

        if (!localState)
           localState = state[algorithm.name] = {};

        servers = algorithm.run(log, localState, servers, ram, vlans);

        if (log.debug()) {
            var serverUuids = servers.map(function (s) { return s.uuid; });
            log.debug({serverUuids: serverUuids}, '%s returned %d server(s)',
                      algorithm.name, serverUuids.length);
        }
    }

    var server = servers[0];

    for (i--; i >= 0; i--) {
        algorithm = algorithms[i];

        if (algorithm.post) {
            localState = state[algorithm.name];
            algorithm.post(log, localState, server, servers, ram, vlans);

            log.trace('Invoked post-alloc callback for %s', algorithm.name);
        }
    }

    return server;
}



module.exports = {
    allocate: allocate
};
