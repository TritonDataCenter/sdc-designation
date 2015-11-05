/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Owners may want to provide hints to DAPI about where they want new zones
 * placed in a DC. For example, they may want a new zone to be placed far
 * away from an existing zone (e.g. two replicating databases), or they may want
 * the new zone to be near an existing zone (e.g. a webhead to a cache).
 *
 * This plugin provides a simple mechanism to fulfill such requests. These
 * requests can be treated as hints or requirements. If 'strict' is true, then
 * the requests are treated as requirements, and if the requirements cannot be
 * met, the request fails. If 'strict' is false or not give, this plugin treats
 * them as hints: it makes an effort to fulfill the constraints, but does not
 * guarantee it will.
 *
 * Here's an example locality hint:
 *
 * locality: {
 *	strict: false,
 *	near: '0c6d54ea-05f9-49a7-a35b-e2dd901afd78',
 *	far: ['c85e0079-fe94-461e-8b1f-9a6d7c0d9b5c',
 *	    'a579ec4d-659f-4f64-89b8-2e9f7130da05']
 * }
 *
 * The above tells this plugin to make a reasonable effort to place the new zone
 * near zone 0c6d54ea-05f9-49a7-a35b-e2dd901afd78, and far from zones c85e0079-
 * fe94-461e-8b1f-9a6d7c0d9b5c and a579ec4d-659f-4f64-89b8-2e9f7130da05. The
 * near and far attributes are both optional, and can either be a UUID or an
 * array of UUIDs; this is just to ease any learning curve for users.
 *
 * The "locality" attribute itself is optional. If it isn't provided, DAPI
 * defaults to attempting to place a new zone far from other zones belonging to
 * the same owner. This means it'll prefer racks which don't contain another
 * of that owner's zones. If it cannot find any such rack, it'll next attempt to
 * find a server which doesn't. If not that either, any server will do.
 *
 * In effect, non-strict "far" prefers "other rack, other server, any server".
 * By comparison, non-strict near prefers "other server in same rack, any server
 * in rack, any server". Currently, far takes priority over near, since far is
 * likely for high availability, while near is for performance.
 *
 * Strict "far" prefers "other rack, other server", or fails. Strict near
 * prefers "same server, same rack", or fails.
 *
 * For security purposes, we only allow hints to work with zones belonging to
 * an owner. It isn't a high barrier to an attacker who might have discovered
 * a zone UUID of another owner, but it is a barrier.
 *
 * Warning: for this plugin to work, calculate-locality.js needs to be very
 * early in the allocation pipeline, before the hard filters. It digests the
 * user-provided locality hint, and passes on a hash which contains a
 * description of what this plugin should do, and the needed locality data to
 * do it.
 */

var STATE_KEY = 'locality'; // name used to get locality info from state hash

var LOCALITY_ALGORITHMS = {
	soft_far: [
		makeSoft(selectOtherServers),
		makeSoft(selectOtherRacks)
	],
	soft_near: [
		makeSoft(selectSameRacks),
		makeSoft(selectOtherNearServers)
	],
	hard_far: [
		selectOtherServers,
		makeSoft(selectOtherRacks)
	],
	hard_near: [
		selectSameRacks,
		makeSoft(selectOtherNearServers)
	]
};

function
filterLocality(log, state, servers, constraints)
{
	var ownerUuid = constraints.vm.owner_uuid;
	var localityData = state[STATE_KEY][ownerUuid];
	var filters = selectLocalityFilters(log, localityData.localities);

	for (var i = 0; i !== filters.length; i++) {
		servers = filters[i](log, servers, localityData);
	}

	return ([servers]);
}

/*
 * Determines which filtering functions should be executed, and in which
 * order.
 */
function
selectLocalityFilters(log, localities)
{
	var filters = [];

	localities.forEach(function (locality) {
		var algorithms = LOCALITY_ALGORITHMS[locality];
		filters = filters.concat(algorithms);
	});

	return (filters);
}

/*
 * Returns a function that always returns servers, including when the algorithm
 * returns none (it then returns the original server list).
 */
function
makeSoft(algorithm)
{
	function soft(log, servers, localityData) {
		var otherServers = algorithm(log, servers, localityData);
		return (otherServers.length > 0 ? otherServers : servers);
	}

	return (soft);
}

/*
 * Returns servers which aren't in the same racks as the servers in farRacks.
 * If there are none, returns all servers for the next step.
 */
function
selectOtherRacks(log, servers, localityData)
{
	var racks = localityData.farRackIds;
	return servers.filter(function (server) {
		var rackId = server.rack_identifier;
		return (rackId && !racks[rackId]);
	});
}

/*
 * Returns servers which are in the same racks as the servers in nearRacks.
 * If there are none, returns all servers for the next step.
 */
function
selectSameRacks(log, servers, localityData)
{
	var racks = localityData.nearRackIds;
	return servers.filter(function (server) {
		var rackId = server.rack_identifier;
		return (rackId && racks[rackId]);
	});
}

/*
 * Returns servers which aren't in the farServers list.
 * If there are none, returns all servers for the next step.
 */
function
selectOtherServers(log, servers, localityData)
{
	var farServers = localityData.farServerUuids;
	return servers.filter(function (server) {
		return (!farServers[server.uuid]);
	});
}

/*
 * Returns servers which are in the same racks (but not the same servers as) as
 * in nearServers. Note that for this to work, it needs to be run after
 * selectSameRacks(). If there are no such servers, returns all servers for the
 * next step.
 */
function
selectOtherNearServers(log, servers, localityData)
{
	var nearServers = localityData.nearServerUuids;
	return servers.filter(function (server) {
		return (!nearServers[server.uuid]);
	});
}

module.exports = {
	name: 'Servers with requested locality considered',
	run: filterLocality,
	affectsCapacity: false
};
