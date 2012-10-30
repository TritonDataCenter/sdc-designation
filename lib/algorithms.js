/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given the algorithms.
 */



function allocate(log, algorithms, servers, ram, vlans) {
    for (var i = 0; i < algorithms.length; i++) {
        var algorithm = algorithms[i];
        servers = algorithm.run(servers, ram, vlans);

        if (servers === undefined) {
            var numServers = 0;
        } else if (typeof (servers) === 'number') {
            numServers = 1;
        } else {
            numServers = servers.length;
        }

        log.trace('%s returned %d server(s)', algorithm.name, numServers);
    }

    return servers;
}



module.exports = {
    allocate: allocate
};
