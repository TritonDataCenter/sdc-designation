/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given the algorithms.
 */



function allocate(algorithms, servers, ram, vlans) {
    for (var i = 0; i < algorithms.length; i++) {
        var algorithm = algorithms[i];
        servers = algorithm.run(servers, ram, vlans);
    }

    return servers;
}



module.exports = {
    allocate: allocate
};
