/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which have been setup.
 */



function filterSetup(log, state, servers) {
    var adequateServers = servers.filter(function (server) {
        return server.setup;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers which have been setup',
    run: filterSetup
};
