/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Filters out all servers which contain zones belonging to a given owner.
 */



function filterSameServers(log, state, servers, constraints) {
    var owner_uuid = constraints.vm.owner_uuid;

    var adequateServers = servers.filter(function (server) {
        var vms = server.vms;
        var vmNames = Object.keys(vms);

        for (var i = 0; i !== vmNames.length; i++) {
            var vm_owner = vms[vmNames[i]].owner_uuid;

            if (vm_owner === owner_uuid) {
                if (log.trace())
                    log.trace('Due to customer on server, omitting server: ' +
                              server.uuid);

                return false;
            }
        }

        return true;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers which do not contain any of an owner\'s zones',
    run: filterSameServers
};
