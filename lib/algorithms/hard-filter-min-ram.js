/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */



function filterMinRam(log, state, servers, vmDetails) {
    var requestedRam = vmDetails.ram / (vmDetails.overprovision_ratio || 1.0);

    var adequateServers = servers.filter(function (server) {
        return server.unreserved_ram >= requestedRam;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers with enough unreserved RAM',
    run: filterMinRam
};
