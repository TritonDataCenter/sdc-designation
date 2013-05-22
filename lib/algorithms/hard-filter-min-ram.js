/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */



function filterMinRam(log, state, servers, vmDetails) {
    var filter;

    if (vmDetails.overprovision_ram) {
        var requestedRam = vmDetails.ram / vmDetails.overprovision_ram;

        filter = function (server) {
            return server.unreserved_ram >= requestedRam;
        };
    } else {
        filter = function (server) {
            return !server.overprovision_ratios.ram;
        };
    }

    return servers.filter(filter);
}



module.exports = {
    name: 'Servers with enough unreserved RAM',
    run: filterMinRam
};
