/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */

var assert = require('assert');



/*
 * Simple randNumber to choose a random server from the list
 */
function randNumber(limit) {
    return Math.floor(Math.random() * limit);
}



function random(servers) {
    return servers[randNumber(servers.length)];
}



function allocate(req) {
    var server;

    // No algorithms defaults to random
    if (!req.algorithms.length)
        return random(req.servers);

    for (var i = 0; i < req.algorithms.length; i++) {
        var algorithm = req.algorithms[i];

        // Go to the next algorithm if the current one happens to return nothing
        server = algorithm.run(req.servers);
        if (server) {
            break;
        }
    }

    return server;
}



module.exports = {
    allocate: allocate,
    random: random
};
