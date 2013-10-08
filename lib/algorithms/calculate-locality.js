/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * This plugin must be run very near or at the beginning of the allocation
 * pipeline, before almost all hard filters. It goes through the unfiltered
 * servers (i.e. they're still all there) in order to figure out what servers
 * and racks will be needed by the later locality filtering step, and saves
 * the results to the state hash for the later plugin's use. Unfortunately,
 * the calculations below cannot be done in that later step since many servers
 * will have been removed by that point, so we won't be able to figure out the
 * location of many servers and racks.
 *
 * For full details of what's going on here, see the big-theory statement in
 * soft-filter-locality-hints.js.
 */



var STATE_KEY = 'locality'; // name used to save locality info to state hash
var FAR_LOCALITY  = 'far';
var NEAR_LOCALITY = 'near';



function calculateLocality(log, state, servers, constraints) {
    var ownerUuid = constraints.vm.owner_uuid;
    var locality  = constraints.vm.locality || {};

    var nearZoneUuids = locality.near || [];
    if (typeof (nearZoneUuids) === 'string')
        nearZoneUuids = [nearZoneUuids];

    var farZoneUuids = locality.far || [];
    if (typeof (farZoneUuids) === 'string')
        farZoneUuids = [farZoneUuids];

    var nearServers, farServers;
    if (nearZoneUuids.length === 0 && farZoneUuids.length === 0) {
        farServers  = getServersHostingOwner(servers, ownerUuid);
        nearServers = [];
    } else {
        nearServers = getServersHostingZones(servers, nearZoneUuids, ownerUuid);
        farServers  = getServersHostingZones(servers, farZoneUuids,  ownerUuid);
    }

    var algorithms = [];
    if (farServers.length > 0)
        algorithms = algorithms.concat(FAR_LOCALITY);
    if (nearServers.length > 0)
        algorithms = algorithms.concat(NEAR_LOCALITY);

    var localityData = {
        nearServerUuids: createServerLookup(nearServers),
        farServerUuids:  createServerLookup(farServers),
        nearRackUuids:   createRackLookup(nearServers),
        farRackUuids:    createRackLookup(farServers),
        algorithms:      algorithms
    };

    addLocalityCalculations(log, state, ownerUuid, localityData);

    return servers;
}



/*
 * Returns a list of servers which contain any zones belonging to the given
 * owner.
 */

function getServersHostingOwner(servers, ownerUuid) {
    var serversWithOwner = servers.filter(function (server) {
        var vmUuids = Object.keys(server.vms);
        if (vmUuids.length === 0)
            return false;

        for (var i = 0; i !== vmUuids.length; i++) {
            var uuid = vmUuids[i];
            var vm = server.vms[uuid];

            if (vm.owner_uuid === ownerUuid)
                return true;
        }

        return false;
    });

    return serversWithOwner;
}



/*
 * Return a list of servers which contain any of the zones given in the args.
 * It ignores zones which do not belong to the given owner though.
 */

function getServersHostingZones(servers, zoneUuids, ownerUuid) {
    if (zoneUuids.length === 0)
        return [];

    var serversWithZones = servers.filter(function (server) {
        for (var i = 0; i !== zoneUuids.length; i++) {
            var uuid = zoneUuids[i];
            var vm = server.vms[uuid];

            if (vm && vm.owner_uuid === ownerUuid)
                return true;
        }
    });

    return serversWithZones;
}



/*
 * Returns a hash of racks which contain all of the given servers.
 */

function createRackLookup(servers) {
    var racks = {};

    for (var i = 0; i !== servers.length; i++) {
        var server = servers[i];
        var rackId = server.rack_identifier;

        if (rackId)
            racks[rackId] = true;
    }

    return racks;
}



/*
 * Returns a hash of the given servers.
 */

function createServerLookup(servers) {
    var serverLookup = {};

    for (var i = 0; i !== servers.length; i++) {
        var server = servers[i];
        serverLookup[server.uuid] = true;
    }

    return serverLookup;
}



/*
 * Add the locality results to the state, to be passed on to
 * soft-filter-locality-hints.js
 */

function addLocalityCalculations(log, state, ownerUuid, localityData) {
    log.debug('Adding locality information for ' + ownerUuid);

    if (!state[STATE_KEY])
        state[STATE_KEY] = {};

    state[STATE_KEY][ownerUuid] = localityData;
}



/*
 * After an allocation, remove any state we attached in the above function.
 */

function removeLocalityCalculations(log, state, server, servers, constraints) {
    var ownerUuid = constraints.vm.owner_uuid;

    log.debug('Removing locality information for ' + ownerUuid);

    delete state[STATE_KEY][ownerUuid];
}



module.exports = {
    name: 'Calculate localities of owner\'s VMs',
    run: calculateLocality,
    post: removeLocalityCalculations
};
