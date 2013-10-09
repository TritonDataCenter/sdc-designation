/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a random server.
 */



function pickRandomServer(log, state, servers) {
    if (servers.length === 0)
        return [];

    var index = Math.floor(Math.random() * servers.length);
    return [servers[index]];
}



module.exports = {
    name: 'Random server',
    run: pickRandomServer,
    affectsCapacity: false
};
