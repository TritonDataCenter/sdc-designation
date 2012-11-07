/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given a list of plugins to select the server. Each
 * plugin contains an algorithm and takes a list of servers, processes the list,
 * then returns a new list. The new list is fed to the next plugin, which does
 * the same.
 *
 * Effectively, this forms a pipeline of algorithms where an array of servers
 * is fed in one end, and an array of servers comes out the other. The final
 * array should be ordered such that the most desirable server(s) for this
 * allocation come first -- i.e. ordered by descending preference. In the final
 * step, the first server (the most desired) will be selected and returned.
 *
 * Each plugin also can optionally have a post-selection hook, which will be
 * invoked after a server has been selected. This is especially useful for
 * caching or cleanup purposes.
 *
 * Note that a non-persistent 'state' hash is provided to each plugin. This hash
 * lives for the duration that the process is up. While useful, please be
 * careful when using this hash, since it turns a stateless algorithm to one
 * that potentially can leak.
 */



var state = {};     // plugin state lives between requests here



/*
 * Takes lists of algorithms and servers, and applies the algorithms to the
 * list of servers to select one for this allocation.
 */

function allocate(log, algorithms, servers, ram, vlans) {
    var origServers = servers;
    var i = 0;

    for (; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];
        var localState = state[algorithm.name];

        if (!localState)
           localState = state[algorithm.name] = {};

        servers = algorithm.run(log, localState, servers, ram, vlans);

        if (log.debug()) {
            var serverUuids = servers.map(function (s) { return s.uuid; });
            log.debug({serverUuids: serverUuids}, '%s returned %d server(s)',
                      algorithm.name, serverUuids.length);
        }
    }

    var server = servers[0];

    for (i--; i >= 0; i--) {
        algorithm = algorithms[i];

        if (algorithm.post) {
            localState = state[algorithm.name];
            algorithm.post(log, localState, server, origServers, ram, vlans);

            log.trace('Invoked post-alloc callback for %s', algorithm.name);
        }
    }

    return server;
}



module.exports = {
    allocate: allocate
};
