/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more free RAM than a given limit
 */



function filterMinRam(servers, requestedRam) {
    var adequateServers = servers.filter(function (server) {
      return server.memory_available_bytes >= requestedRam;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers with enough available RAM',
    run: filterMinRam
};
