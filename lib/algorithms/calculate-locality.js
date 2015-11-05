/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
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

var STATE_KEY = 'locality'; /* name used to save locality info to state hash */

var SOFT_FAR_LOCALITY = 'soft_far';
var HARD_FAR_LOCALITY = 'hard_far';

var SOFT_NEAR_LOCALITY = 'soft_near';
var HARD_NEAR_LOCALITY = 'hard_near';

function
calculateLocality(log, state, servers, constraints)
{
	var ownerUuid = constraints.vm.owner_uuid;
	var locality = constraints.vm.locality || {};
	var nearZoneUuids = locality.near || [];
	var farZoneUuids = locality.far || [];
	var strict = locality.strict || false;
	var localities = [];
	var nearServers, farServers;

	if (typeof (nearZoneUuids) === 'string')
		nearZoneUuids = [nearZoneUuids];

	if (typeof (farZoneUuids) === 'string')
		farZoneUuids = [farZoneUuids];

	if (nearZoneUuids.length === 0 && farZoneUuids.length === 0) {
		farServers = getServersHostingOwner(servers, ownerUuid);
		nearServers = [];
	} else {
		nearServers = getServersHostingZones(servers,
		    nearZoneUuids, ownerUuid);
		farServers = getServersHostingZones(servers,
		    farZoneUuids,  ownerUuid);
	}

	if (farServers.length > 0) {
		var farLoc = strict ? HARD_FAR_LOCALITY : SOFT_FAR_LOCALITY;
		localities = localities.concat(farLoc);
	}

	if (nearServers.length > 0) {
		var nearLoc = strict ? HARD_NEAR_LOCALITY : SOFT_NEAR_LOCALITY;
		localities = localities.concat(nearLoc);
	}

	var localityData = {
		nearServerUuids: createServerLookup(nearServers),
		farServerUuids: createServerLookup(farServers),
		nearRackIds: createRackLookup(nearServers),
		farRackIds: createRackLookup(farServers),
		localities: localities
	};

	addLocalityCalculations(log, state, ownerUuid, localityData);

	return ([servers]);
}

/*
 * Returns a list of servers which contain any zones belonging to the given
 * owner.
 */
function getServersHostingOwner(servers, ownerUuid) {
	var serversWithOwner = servers.filter(function (server) {
		var vmUuids = Object.keys(server.vms);
		if (vmUuids.length === 0)
			return (false);

		for (var i = 0; i !== vmUuids.length; i++) {
			var uuid = vmUuids[i];
			var vm = server.vms[uuid];

			if (vm.owner_uuid === ownerUuid)
				return (true);
		}

		return (false);
	});

	return (serversWithOwner);
}

/*
 * Return a list of servers which contain any of the zones given in the args.
 * It ignores zones which do not belong to the given owner though.
 */
function
getServersHostingZones(servers, zoneUuids, ownerUuid)
{
	var serversWithZones;

	if (zoneUuids.length === 0)
		return ([]);

	serversWithZones = servers.filter(function (server) {
		for (var i = 0; i !== zoneUuids.length; i++) {
			var uuid = zoneUuids[i];
			var vm = server.vms[uuid];

			if (vm && vm.owner_uuid === ownerUuid)
				return (true);
		}
	});

	return (serversWithZones);
}

/*
 * Returns a hash of racks which contain all of the given servers.
 */
function
createRackLookup(servers)
{
	var racks = {};

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		var rackId = server.rack_identifier;

		if (rackId)
			racks[rackId] = true;
	}

	return (racks);
}

/*
 * Returns a hash of the given servers.
 */
function
createServerLookup(servers)
{
	var serverLookup = {};

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		serverLookup[server.uuid] = true;
	}

	return (serverLookup);
}

/*
 * Add the locality results to the state, to be passed on to
 * soft-filter-locality-hints.js
 */
function
addLocalityCalculations(log, state, ownerUuid, localityData)
{
	log.debug('Adding locality information for ' + ownerUuid);

	if (!state[STATE_KEY])
		state[STATE_KEY] = {};

	state[STATE_KEY][ownerUuid] = localityData;
}

/*
 * After an allocation, remove any state we attached in the above function.
 */
function
removeLocalityCalculations(log, state, server, servers, constraints)
{
	var ownerUuid = constraints.vm.owner_uuid;

	log.debug('Removing locality information for ' + ownerUuid);

	delete state[STATE_KEY][ownerUuid];
}

module.exports = {
	name: 'Calculate localities of owner\'s VMs',
	run: calculateLocality,
	post: removeLocalityCalculations,
	affectsCapacity: false
};
