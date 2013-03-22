/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers which have the same overprovisioning ratio as the requested
 * VM. Typically we want VMs with the same overprovision ratio to go on the same
 * servers. Mixing VMs with different overprovision ratios causes some problems:
 *
 * - If an VM with a high ratio (e.g. 2.0) is allocated onto a server with a
 *   low ratio (e.g. 1.0), the 1.0 guarantee cannot be held for other 1.0 VMs on
 *   that server.
 *
 * - If an VM with a low ratio (e.g. 1.0) is allocated onto a server with a high
 *   ratio (e.g. 2.0), the 1.0 guarantee cannot be held for that VM due to the
 *   2.0 VMs on that server.
 */



function filterOverprovisionRatio(log, state, servers, vmDetails) {
    var overprovisionRatio = canonicalize(vmDetails.overprovision_ratio);

    var adequateServers = servers.filter(function (server) {
        return canonicalize(server.overprovision_ratio) === overprovisionRatio;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers with same overprovision ratio as requested VM',
    run: filterOverprovisionRatio
};



/*
 * In order to avoid problems with floating-point comparisons.
 *
 * The ratio is optional, so when it's not present, it's treated as a 1.0.
 */

function canonicalize(num) {
    return (num || 1.0).toFixed(2);
}