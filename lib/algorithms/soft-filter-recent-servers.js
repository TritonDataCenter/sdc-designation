/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which haven't been used for allocations the past
 * five minutes, unless there aren't enough servers left.
 *
 * The purpose of this plugin is to mitigate collisions caused by concurrent
 * requests, e.g. five 8GiB VMs are requested at the same time, thus are likely
 * to be allocated to the same server. One means of doing this is locking, but
 * that requires communication with external services and reduces concurrency.
 * Instead we take a good-enough approach of remembering which servers were
 * used for allocation the past five minutes and not using them for this
 * request (unless there aren't enough servers).
 */

var MAX_AGE = 5 * 60 * 1000;	// five min in ms
var MAX_REMOVED_RATIO = 0.25;   // between 0.0 and 1.0

var STATE_KEY = 'recent_servers'; // name for saving recent info to state hash

/*
 * Takes a list of servers and returns a list where some or all servers which
 * have recently been seen for previous allocations.
 */
function
filterRecentServers(log, state, servers)
{
	var recentServers = updateRecentServers(state);
	var collidingServers = findCollidingServers(servers, recentServers);
	var adequateServers;

	if (collidingServers.length > 0 && log.trace()) {
		var uuids = collidingServers.map(function (s) { return s[1]; });
		log.trace('Server(s) %s used for allocation within last ' +
		    '%dms; considering dropping some or all for this round',
		    uuids, MAX_AGE);
	}

	adequateServers = removeCollidingServers(servers, collidingServers);

	return ([adequateServers]);
}

/*
 * Finds which servers in the current request have been seen recently. Returns
 * which servers these are and how long ago each was seen.
 */
function
findCollidingServers(servers, recent)
{
	var collisions = [];

	for (var i = 0; i != servers.length; i++) {
		var uuid = servers[i].uuid;
		var timestamp = recent[uuid];

		if (timestamp)
			collisions.push([timestamp, uuid]);
	}

	return (collisions);
}

/*
 * Removes some (or all, if enough are left over) of the most recently seen
 * servers from consideration.
 */
function
removeCollidingServers(servers, colliding)
{
	var numToRemove;
	var removeServers;
	var removeUuids;
	var newestRemoved;

	if (colliding.length === 0)
		return (servers);

	numToRemove = Math.min(servers.length * MAX_REMOVED_RATIO,
	    colliding.length);

	if (numToRemove === colliding.length) {
		removeServers = colliding;
	} else {
		/* drop older servers from list of servers to remove */
		var ordered = colliding.sort(function (a, b) {
			return (b[0] - a[0]);
		});
		removeServers = ordered.slice(0, numToRemove);
	}

	removeUuids = removeServers.map(function (s) { return s[1]; });

	newestRemoved = servers.filter(function (server) {
		/* hopefully there aren't too many to remove! */
		return (removeUuids.indexOf(server.uuid) === -1);
	});

	return (newestRemoved);
}

/*
 * Removes expired servers from state (i.e. timestamp is older than five
 * minutes), and returns servers seen less than five minutes ago.
 */
function
updateRecentServers(state)
{
	var cutoffTimestamp = +new Date() - MAX_AGE;
	var recentlySeen = state[STATE_KEY] || {};

	Object.keys(recentlySeen).forEach(function (uuid) {
		if (recentlySeen[uuid] < cutoffTimestamp)
			delete recentlySeen[uuid];
	});

	state[STATE_KEY] = recentlySeen;

	return (recentlySeen);
}

/*
 * Adds a server and timestamp to state; used for future requests.
 */
function
addToRecentServers(log, state, server)
{
	if (server)
		state[STATE_KEY][server.uuid] = +new Date();
}

module.exports = {
	name: 'Servers which have not been allocated to recently',
	run: filterRecentServers,
	post: addToRecentServers,
	affectsCapacity: false
};
