/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * This strips any overprovisioning attributes and sets them all to 1.0.
 */



var DEFAULT_SERVER_RATIOS = { cpu: 4, ram: 1, disk: 1 };



function overrideOverprovisioning(log, state, servers, vmDetails, imgDetails,
                                  pkgDetails) {
    pkgDetails.overprovision_cpu  = DEFAULT_SERVER_RATIOS.cpu;
    pkgDetails.overprovision_ram  = DEFAULT_SERVER_RATIOS.ram;
    pkgDetails.overprovision_disk = DEFAULT_SERVER_RATIOS.disk;
    delete pkgDetails.overprovision_net;
    delete pkgDetails.overprovision_io;

    servers.forEach(function (server) {
        server.overprovision_ratios = DEFAULT_SERVER_RATIOS;
    });

    return servers;
}



module.exports = {
    name: 'Force overprovisioning to fixed values',
    run: overrideOverprovisioning
};
