/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns a server randomly chosen from the first 5% given servers.
 * This assumes that the servers have already been sorted in descending order
 * of preference.
 *
 * The purpose of this plugin is to help mitigate collisions caused by
 * concurrent requests, e.g. five 8GiB VMs are requested at the same time,
 * thus are likely to be allocated to the same server without randomization.
 */



var SERVER_SELECTION_RANGE = 0.05;



/*
 * Randomly pick one of the top 20% servers if there's enough servers, otherwise
 * returns top choice.
 */

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
