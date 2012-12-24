/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */



function filterMinDisk(log, state, servers, _, requestedDisk) {
    if (!requestedDisk)
        return servers;

    var adequateServers = servers.filter(function (server) {
        return server.unreserved_disk >= requestedDisk;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers with enough unreserved disk',
    run: filterMinDisk
};
