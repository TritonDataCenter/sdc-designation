/*
 * Copyright (c) 2014, Joyent, Inc. All rights reserved.
 *
 * Returns servers which have all the required VLANs.
 *
 * Servers have NIC "tags" attached to each NIC, which is visible in that
 * server's sysinfo. Tags are a means of telling whether certain networks are
 * accessible on a NIC. When a server is requested from DAPI, a set of tags are
 * provided, which DAPI then attempts to match against the union of all tags
 * present on a server's NICs.
 *
 * In short, if a server doesn't have all the requested tags on one or more of
 * its NICs, that means it cannot reach all the networks that the new VM being
 * allocated must be able to reach, thus the server is dropped from further
 * consideration.
 */



function filterVlans(log, state, servers, constraints) {
    var reasons = constraints.capacity ? null : {};
    var requestedVlans = constraints.vm.nic_tags;

    if (!requestedVlans)
        return [servers];

    var adequateServers = servers.filter(function (server) {
        var interfaces = server.sysinfo['Network Interfaces'];

        if (!interfaces) {
            if (reasons)
                reasons[server.uuid] = 'Server missing interfaces in sysinfo';
            return false;
        }

        var tags = getTags(interfaces);
        var onlineTags  = tags[0];
        var offlineTags = tags[1];

        // jsl:ignore
        for (var i = 0; i !== requestedVlans.length; i++) {
        // jsl:end
            var tag = requestedVlans[i];

            if (onlineTags[tag])
                continue;

            if (offlineTags[tag]) {
                if (reasons) {
                    var nic = offlineTags[tag];
                    reasons[server.uuid] = 'NIC ' + nic.interface + ' for ' +
                                           'tag "' + tag + '" is ' +
                                            nic['Link Status'];
                }
            } else if (reasons) {
                reasons[server.uuid] = 'Server missing vlan "' + tag + '"';
            }

            return false;
        }

        return true;
    });

    return [adequateServers, reasons];
}



function getTags(interfaces) {
    var onlineTags = {};
    var offlineTags = {};

    Object.keys(interfaces).forEach(function (nicName) {
        var nic = interfaces[nicName];
        var nicStatus = nic['Link Status'];
        var nicTags   = nic['NIC Names'];

        nic.interface = nicName;

        var tagIndex = (nicStatus === 'up' ? onlineTags : offlineTags);

        for (var i = 0; i !== nicTags.length; i++) {
            tagIndex[nicTags[i]] = nic;
        }
    });

    return [onlineTags, offlineTags];
}



module.exports = {
    name: 'Servers supporting required VLANs',
    run: filterVlans,
    affectsCapacity: true
};
