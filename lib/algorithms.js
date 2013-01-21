/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given a tree of plugins to select the server. Each
 * plugin contains an algorithm and takes a list of servers, processes the list,
 * then returns a new list. The new list is fed to the next plugin, which does
 * the same.
 *
 * An example tree:
 *
 * ['pipe', <plugin 1>,
 *          ['or', <plugin 2>,
 *                 <plugin 3>],
 *          <plugin 4>]
 *
 * The tree is built similarly to expressions in Lisp: the first item in the
 * array is a command, and all other elements are either plugins or sub-arrays
 * of commands and plugins.
 *
 * This module recognizes two commands: 'pipe' and 'or'. 'pipe' feeds the list
 * of servers to the first plugin, the result from the first plugin is fed to
 * the second plugin, and so forth. 'or' iterates through every plugin, feeding
 * each with the full list of servers until a plugin returns a non-empty list.
 *
 * The final array should be ordered such that the most desirable server(s) for
 * this allocation come first -- i.e. ordered by descending preference. In the
 * final step, the first server (the most desired) will be selected and
 * returned.
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
 * Takes a list of servers and a tree of algorithms, and applies the algorithms
 * to the list of servers to select one for this allocation.
 */

function allocate(log, algorithms, servers, vmDetails) {
    servers = massageServerData(servers);
    var origServers = servers;

    log.trace('State before plugin flow: ', state);

    var result = dispatch(log, algorithms, servers, vmDetails);
    var server = result[0][0];
    var visitedAlgorithms = result[1];

    cleanup(log, visitedAlgorithms, server, origServers, vmDetails);

    log.trace('State after plugin flow: ', state);

    return server;
}



/*
 * Takes an array of plugins with a command prefix, and dispatches the array
 * of plugins to a function that can handle the command prefix. There are
 * two recognized commands: 'pipe' and 'or'.
 */

function dispatch(log, algorithms, servers, vmDetails) {
    var result;

    // we don't use shift(), to avoid modifying the referenced object
    var command = algorithms[0];
    algorithms = algorithms.slice(1, algorithms.length);

    if (log.trace() && (command === 'pipe' || command === 'or')) {
        log.trace('Dispatching on "' + command + '"');
    }

    if (command === 'pipe') {
        result = pipe(log, algorithms, servers, vmDetails);
    } else if (command === 'or') {
        result = or(log, algorithms, servers, vmDetails);
    } else {
        log.error('Bad sexp command: ' + command);
        process.exit(1);
    }

    return result;
}



/*
 * Takes an array of plugins, and forms a pipeline between all of them. A list
 * of servers is fed in to the first plugin, the servers the first plugin
 * returns are fed to the second plugin, and so on; this continues until all
 * plugins (or sub-expressions) are run, or until a plugin returns no servers.
 */

function pipe(log, algorithms, servers, vmDetails) {
    var visitedAlgorithms = [];

    for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            servers = dispatch(log, algorithm, servers, vmDetails);
            continue;
        }

        var localState = state[algorithm.name];

        if (!localState)
            localState = state[algorithm.name] = {};

        servers = algorithm.run(log, localState, servers, vmDetails);
        visitedAlgorithms.push(algorithm);

        if (log.debug()) {
            var serverUuids = servers.map(function (s) { return s.uuid; });
            log.debug({ serverUuids: serverUuids }, '%s returned %d server(s)',
                      algorithm.name, serverUuids.length);
        }
    }

    return [ servers, visitedAlgorithms ];
}



/*
 * Takes an array of plugins, and feeds the list of servers to each plugin in
 * turn until a plugin returns a non-empty list of servers.
 */

function or(log, algorithms, initialServers, vmDetails) {
    var visitedAlgorithms = [];
    var servers = [];

    for (var i = 0; i < algorithms.length; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            servers = dispatch(log, algorithm, initialServers, vmDetails);
        } else {
            var localState = state[algorithm.name];

            if (!localState)
                localState = state[algorithm.name] = {};

            servers = algorithm.run(log, localState, initialServers, vmDetails);
            visitedAlgorithms.push(algorithm);

            if (log.debug()) {
                var serverUuids = servers.map(function (s) { return s.uuid; });
                log.debug({ serverUuids: serverUuids },
                          '%s returned %d server(s)',
                          algorithm.name, serverUuids.length);
            }
        }

        if (servers.length > 0)
            break;
    }

    return [ servers, visitedAlgorithms ];
}



/*
 * Takes a list of all plugins that were visited during allocation, and executes
 * the post() function on each one once.
 */

function cleanup(log, visitedAlgorithms, server, origServers, vmDetails) {
    var alreadyRun = {};

    for (var i = visitedAlgorithms.length - 1; i >= 0; i--) {
        var algorithm = visitedAlgorithms[i];

        if (!algorithm.post || alreadyRun[algorithm.name])
            continue;

        var localState = state[algorithm.name];
        algorithm.post(log, localState, server, origServers, vmDetails);

        alreadyRun[algorithm.name] = true;

        log.trace('Invoked post-alloc callback for %s', algorithm.name);
    }
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
