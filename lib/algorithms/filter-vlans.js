/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers with more free RAM than a given limit
 */



function filterVlans(log, servers, _, requestedVlans) {
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
            if (allNicTags.indexOf(requestedVlans[i]) === -1)
                return false;
        }

        return true;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers supporting required VLANs',
    run: filterVlans
};
