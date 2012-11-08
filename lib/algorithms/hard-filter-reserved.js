/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which are not reserved.
 */



function filterReserved(log, state, servers) {
    var adequateServers = servers.filter(function (server) {
        return !server.reserved;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers which are not reserved',
    run: filterReserved
};
