/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved disk than the disk requested for this
 * allocation.
 */



function filterMinDisk(log, state, servers, constraints) {
    var img = constraints.img;
    var pkg = constraints.pkg;
    var vm  = constraints.vm;
    var filter;

    // VM allocation without a quota is also valid
    if (!vm.quota)
        return servers;

    if (pkg.overprovision_disk) {
        var requestedDisk;

        if (vm.brand === 'kvm' || img.type === 'zvol') {
            // image_size applies to disk[0], quota to disk[1], and 10240 is the
            // root dataset size
            requestedDisk = vm.quota + img.image_size + 10240;
        } else {
            requestedDisk = vm.quota / pkg.overprovision_disk;
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
