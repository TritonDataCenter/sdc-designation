/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which are not reserved.
 */



function filterReserved(log, servers) {
    var adequateServers = servers.filter(function (server) {
        return server.reserved === 'false' || server.reserved === false;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers which are not reserved',
    run: filterReserved
};
