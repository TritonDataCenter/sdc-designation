/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which have the required VLANs.
 */



function filterVlans(log, state, servers, constraints) {
    var reasons = constraints.capacity ? null : {};
    var requestedVlans = constraints.vm.nic_tags;

    var adequateServers = servers.filter(function (server) {
        var interfaces = server.sysinfo['Network Interfaces'];
        var nicNames = Object.keys(interfaces);

        var allNicTags = [];
        nicNames.forEach(function (nicName) {
            var nic = interfaces[nicName];

            if (nic['Link Status'] !== 'up')
                return;

            var nicTags = nic['NIC Names'];
            allNicTags = allNicTags.concat(nicTags);
        });

        // assuming we don't ever end up with servers with large numbers of
        // nic tags!
        for (var i = 0; i != requestedVlans.length; i++) {
            var vlan = requestedVlans[i];

            if (allNicTags.indexOf(vlan) === -1) {
                if (reasons)
                    reasons[server.uuid] = 'Server missing vlan "' + vlan + '"';

                return false;
            }
        }

        return true;
    });

    return [adequateServers, reasons];
}



module.exports = {
    name: 'Servers supporting required VLANs',
    run: filterVlans,
    affectsCapacity: true
};
