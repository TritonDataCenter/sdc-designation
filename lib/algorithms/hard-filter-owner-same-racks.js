/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Filters out all servers sharing racks with servers that have an owner's
 * zone(s). AKA, only returns servers in racks which do not contain any of an
 * owner's zones.
 */



function filterSameRacks(log, state, servers, constraints) {
    var reasons = constraints.capacity ? null : {};
    var owner_uuid = constraints.vm.owner_uuid;
    var excludedRacks = findRacksWithCustomer(servers, owner_uuid);

    if (log.trace()) {
        var rackStr = Object.keys(excludedRacks).join(', ');
        log.trace('Racks excluded: ' + rackStr);
    }

    var adequateServers = servers.filter(function (server) {
        var rackId = server.rack_identifier;
        var keepServer = ! excludedRacks[rackId];

        if (!keepServer)
            log.trace('Due to owner in rack, omitting server: ' + server.uuid);

        if (!keepServer && reasons) {
            var msg = 'VM\'s owner has another VM in rack ' + rackId;
            reasons[server.uuid] = msg;
        }

        return keepServer;
    });

    return [adequateServers, reasons];
}



function findRacksWithCustomer(servers, owner_uuid) {
    var excludedRacks = {};

    servers.forEach(function (server) {
        var rackIdentifier = server.rack_identifier;
        var vms = server.vms;

        if (!rackIdentifier || !vms || excludedRacks[rackIdentifier])
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
    run: filterSameRacks,
    affectsCapacity: true
};
