/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server randomly chosen from the first 20% given servers.
 * This assumes that the servers have already been sorted in descending order
 * of preference.
 */



var SERVER_SELECTION_RANGE = 0.2;



function pickRandomWeightedServer(log, state, servers) {
    if (servers.length === 0)
        return [];

    var range = Math.floor(servers.length * SERVER_SELECTION_RANGE);
    if (range < 1) {
        log.trace('Too few servers for random selection; returning top choice');
        return [servers[0]];
    }

    servers = servers.slice(0, range);

    var index = Math.floor(Math.random() * servers.length);
    var server = servers[index];

    return [server];
}



module.exports = {
    name: 'Random weighted server',
    run: pickRandomWeightedServer
};
