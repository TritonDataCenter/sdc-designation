/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved RAM than the RAM requested for this
 * allocation.
 */



function filterMinDisk(log, state, servers, vmDetails) {
    var filter;

    // VM allocation without a quota is also valid
    if (!vmDetails.quota)
        return servers;

    if (vmDetails.overprovision_disk) {
        var requestedDisk = vmDetails.quota / vmDetails.overprovision_disk;
        requestedDisk *= 1024; // to MiB

        filter = function (server) {
            return server.unreserved_disk >= requestedDisk;
        };
    } else {
        filter = function (server) {
            return !server.overprovision_ratios.disk;
        };
    }

    return servers.filter(filter);
}



module.exports = {
    name: 'Servers with enough unreserved disk',
    run: filterMinDisk
};
