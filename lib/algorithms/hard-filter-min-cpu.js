/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more unreserved CPU than the CPU requested for this
 * allocation.
 */



function filterMinCpu(log, state, servers, vmDetails) {
    var filter;

    // VM allocation without a cpu_cap is also valid
    if (!vmDetails.cpu_cap)
        return servers;

    if (vmDetails.overprovision_cpu) {
        var requestedCpu = vmDetails.cpu_cap / vmDetails.overprovision_cpu;

        filter = function (server) {
            return server.unreserved_cpu >= requestedCpu;
        };
    } else {
        filter = function (server) {
            return !server.overprovision_ratios.cpu;
        };
    }

    return servers.filter(filter);
}



module.exports = {
    name: 'Servers with enough unreserved CPU',
    run: filterMinCpu
};
