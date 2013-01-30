/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Filters out all servers sharing racks with servers that have an owner's
 * zone(s). AKA, only returns servers in racks which do not contain any of an
 * owner's zones.
 */



function filterSameRacks(log, state, servers, vmDetails) {
    var owner_uuid = vmDetails.owner_uuid;
    var excludedRacks = findRacksWithCustomer(servers, owner_uuid);

    if (log.trace()) {
        var rackStr = Object.keys(excludedRacks).join(', ');
        log.trace('Racks excluded: ' + rackStr);
    }

    var adequateServers = servers.filter(function (server) {
        var keepServer = ! excludedRacks[server.rack_identifier];

        if (!keepServer && log.trace())
            log.trace('Due to owner in rack, omitting server: ' + server.uuid);

        return keepServer;
    });

    return adequateServers;
}



function findRacksWithCustomer(servers, owner_uuid) {
    var excludedRacks = {};

    servers.forEach(function (server) {
        var rackIdentifier = server.rack_identifier;
        var vms = server.vms;

        if (!rackIdentifier || excludedRacks[rackIdentifier])
            return;

        var vmNames = Object.keys(vms);

        for (var i = 0; i !== vmNames.length; i++) {
            var vm_owner = vms[vmNames[i]].owner_uuid;

            if (vm_owner === owner_uuid) {
                excludedRacks[rackIdentifier] = true;
                return;
            }
        }
    });

    return excludedRacks;
}



module.exports = {
    name: 'Servers which are not in racks containing any of an owner\'s zones',
    run: filterSameRacks
};
