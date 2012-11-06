/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which haven't been used for allocations the past
 * five seconds, unless there aren't enough servers left.
 */



var MAX_AGE = 5000;  // in ms
var MAX_REMOVED_RATIO = 0.25;



function filterRecentServers(log, state, servers) {
    var recentlySeenServers = updateRecentServers(state, servers);
    var collidingServers = findCollidingServers(servers, recentlySeenServers);
    var adequateServers = removeCollidingServers(servers, collidingServers);

    return adequateServers;
}



function findCollidingServers(servers, recentlySeen) {
    var collisions = [];

    for (var i = 0; i != servers.length; i++) {
        var uuid = servers[i].uuid;
        var timestamp = recentlySeen[uuid];

        if (timestamp)
            collisions.push([timestamp, uuid]);
    }

    return collisions;
}



function removeCollidingServers(servers, colliding) {
    if (colliding.length === 0)
        return servers;

    var numToRemove = Math.min(servers.length * MAX_REMOVED_RATIO,
                               colliding.length);

    if (numToRemove === colliding.length) {
        var removeServers = colliding;
    } else {
        // drop older servers from list of servers to remove
        var ordered = colliding.sort(function (a, b) { return b[0] - a[0]; });
        removeServers = ordered.slice(0, numToRemove);
    }

    var removeUuids = removeServers.map(function (s) { return s[1]; });

    var oldestRemoved = servers.filter(function (server) {
        // hopefully there aren't too many to remove!
        return removeUuids.indexOf(server.uuid) === -1;
    });

    return oldestRemoved;
}



function updateRecentServers(state, servers) {
    var cutoffTimestamp = +new Date() - MAX_AGE;
    var recentlySeen = state.recent_servers || {};

    Object.keys(recentlySeen).forEach(function (uuid) {
      if (recentlySeen[uuid] < cutoffTimestamp)
          delete recentlySeen[uuid];
    });

    state.recent_servers = recentlySeen;

    return recentlySeen;
}



function addToRecentServers(log, state, server) {
    state.recent_servers[server.uuid] = +new Date();
}



module.exports = {
    name: 'Servers which have not been allocated to recently',
    run: filterRecentServers,
    post: addToRecentServers
};
