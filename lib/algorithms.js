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



var RESERVED_ARC_RATIO = 0.15;  // how much RAM on each server is left for ARC
var state = {};     // plugin state lives between requests here



/*
 * Takes lists of algorithms and servers, and applies the algorithms to the
 * list of servers to select one for this allocation.
 */

function allocate(log, algorithms, servers, vmDetails) {
    var i = 0;

    servers = massageServerData(servers);
    var origServers = servers;

    log.trace('State before plugin chain: ', state);

    for (; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];
        var localState = state[algorithm.name];

        if (!localState)
           localState = state[algorithm.name] = {};

        servers = algorithm.run(log, localState, servers, vmDetails);

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
            algorithm.post(log, localState, server, origServers, vmDetails);

            log.trace('Invoked post-alloc callback for %s', algorithm.name);
        }
    }

    log.trace('State after plugin chain: ', state);

    return server;
}



/*
 * Computes what the unreserved RAM and disk on each server so that plugins
 * don't have to (unreserved RAM being commonly used by plugins).
 */

function massageServerData(servers) {
    for (var i = 0; i != servers.length; i++) {
        var server = servers[i];
        var vms = server.vms;

        server.unreserved_disk = server['Zpool Size in GiB'] * 1024;  // to mb
        server.unreserved_ram  = (server.memory_total_bytes / 1024 / 1024) *
                                 (1 - RESERVED_ARC_RATIO);  // to mb

        if (!vms)
            continue;

        var vmUuids = Object.keys(vms);

        for (var j = 0; j != vmUuids.length; j++) {
            var vm = vms[vmUuids[j]];
            server.unreserved_disk -= vm.quota;
            server.unreserved_ram  -= vm.max_physical_memory;
        }
    }

    return servers;
}



module.exports = {
    allocate: allocate
};
