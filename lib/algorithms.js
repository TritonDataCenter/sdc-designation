/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given the algorithms.
 */



function allocate(log, algorithms, servers, ram, vlans) {
    for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];
        servers = algorithm.run(servers, ram, vlans);

        log.trace('%s returned %d server(s)', algorithm.name, servers.length);
    }

    return servers[0];
}



module.exports = {
    allocate: allocate
};
