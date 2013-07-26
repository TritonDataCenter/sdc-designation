/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved disk than the disk requested for this
 * allocation.
 */



function filterMinDisk(log, state, servers, vmDetails, imgDetails, pkgDetails) {
    var filter;

    // VM allocation without a quota is also valid
    if (!vmDetails.quota)
        return servers;

    if (pkgDetails.overprovision_disk) {
        var requestedDisk;

        if (vmDetails.brand === 'kvm') {
            // image_size applies to disk[0], quota to disk[1], and 10240 is the
            // root dataset size
            requestedDisk = vmDetails.quota + imgDetails.image_size + 10240;
        } else {
            requestedDisk = vmDetails.quota / pkgDetails.overprovision_disk;
        }

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
