/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given the algorithms.
 */



function allocate(algorithms, servers, ram) {
    var server;

    // Try algorithms until one returns a server
    for (var i = 0; !server && i < algorithms.length; i++) {
        var algorithm = algorithms[i];
        server = algorithm.run(servers, ram);
    }

    return server;
}



module.exports = {
    allocate: allocate
};
