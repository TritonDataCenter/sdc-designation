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



var fs = require('fs');



var ALGORITHMS_PATH = __dirname + '/algorithms/';
var RESERVED_ARC_RATIO = 0.15;  // how much RAM on each server is left for ARC
var DEFAULT_FLOW = [ 'pipe',
                     'hard-filter-min-ram.js', 'hard-filter-running.js',
                     'hard-filter-setup.js', 'hard-filter-reserved.js',
                     'hard-filter-headnode.js', 'soft-filter-large-servers.js',
                     'soft-filter-recent-servers.js', 'sort-2adic.js',
                     'pick-weighted-random.js' ];

// data preserved across objects
var state = {};          // plugin state lives between requests here
var availableAlgorithms; // what's available for use



/*
 */

var Algorithms = module.exports =
function (log, description) {
    this.log = log;

    if (!availableAlgorithms)
        availableAlgorithms = this._loadAvailableAlgorithms();

    if (!description) {
        description = DEFAULT_FLOW;
        log.info('No algorithm flow listed, using default');
    }

    this.algorithms = this._loadFlow(description, availableAlgorithms);
};



/*
 * Takes a list of servers, and applies the algorithms to the list of servers to
 * select one for this allocation.
 */

Algorithms.prototype.allocate =
function (servers, vmDetails) {
    var self = this;

    servers = self._massageServerData(servers);

    self.log.trace('State before plugin flow: ', state);

    var result = self._dispatch(self.algorithms, servers, vmDetails);
    var server = result[0][0];
    var visitedAlgorithms = result[1];

    self._cleanup(visitedAlgorithms, server, servers, vmDetails);

    self.log.trace('State after plugin flow: ', state);

    return server;
};



/*
 * Takes an array of plugins with a command prefix, and dispatches the array
 * of plugins to a function that can handle the command prefix. There are
 * two recognized commands: 'pipe' and 'or'.
 */

Algorithms.prototype._dispatch =
function (algorithms, servers, vmDetails) {
    var self = this;
    var result;

    // we don't use shift(), to avoid modifying the referenced object
    var command = algorithms[0];
    algorithms = algorithms.slice(1, algorithms.length);

    if (self.log.trace() && (command === 'pipe' || command === 'or')) {
        self.log.trace('Dispatching on "' + command + '"');
    }

    if (command === 'pipe') {
        result = self._pipe(algorithms, servers, vmDetails);
    } else if (command === 'or') {
        result = self._or(algorithms, servers, vmDetails);
    } else {
        self.log.error('Bad sexp command: ' + command);
        process.exit(1);
    }

    return result;
};



/*
 * Takes an array of plugins, and forms a pipeline between all of them. A list
 * of servers is fed in to the first plugin, the servers the first plugin
 * returns are fed to the second plugin, and so on; this continues until all
 * plugins (or sub-expressions) are run, or until a plugin returns no servers.
 */

Algorithms.prototype._pipe =
function (algorithms, servers, vmDetails) {
    var self = this;
    var log = self.log;
    var visitedAlgorithms = [];

    for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            servers = self._dispatch(algorithm, servers, vmDetails);
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
};



/*
 * Takes an array of plugins, and feeds the list of servers to each plugin in
 * turn until a plugin returns a non-empty list of servers.
 */

Algorithms.prototype._or =
function (algorithms, initialServers, vmDetails) {
    var self = this;
    var log = self.log;
    var visitedAlgorithms = [];
    var servers = [];

    for (var i = 0; i < algorithms.length; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            servers = self._dispatch(algorithm, initialServers, vmDetails);
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
};



/*
 * Takes a list of all plugins that were visited during allocation, and executes
 * the post() function on each one once.
 */

Algorithms.prototype._cleanup =
function (visitedAlgorithms, server, origServers, vmDetails) {
    var self = this;
    var log = self.log;
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
};



/*
 * Computes what the unreserved RAM and disk on each server so that plugins
 * don't have to (unreserved RAM being commonly used by plugins).
 */

Algorithms.prototype._massageServerData =
function (servers) {
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
};



/*
 * Loads all algorithms listed in the config file. If no algorithms is listed
 * then a default algorithm pipeline will be used.
 */

Algorithms.prototype._loadAvailableAlgorithms =
function () {
    var self = this;

    var algoNames = [];
    var loadedAlgorithms = {};

    var files = fs.readdirSync(ALGORITHMS_PATH);
    var algorithmFiles = files.filter(function (file) {
        return file.match(/\.js$/);
    });

    algorithmFiles.forEach(function (fileName) {
        var algorithm = self._loadAlgorithm(fileName);

        if (algorithm) {
            loadedAlgorithms[fileName] = algorithm;
            algoNames.push(algorithm.name);
        }
    });

    self.log.info('Loaded the following algorithms: ', algoNames);

    return loadedAlgorithms;
};



/*
 * Load an algorithm from a file. Return the algorithm if valid.
 */

Algorithms.prototype._loadAlgorithm =
function (fileName) {
    var self = this;
    var algoPath = ALGORITHMS_PATH + fileName;

    var algorithm = require(algoPath);

    if (!algorithm.run || typeof (algorithm.run) !== 'function') {
        /* JSSTYLED */
        self.log.error("Algorithm '%s' does not have a run function", fileName);
        return null;
    } else if (!algorithm.name || typeof (algorithm.name) != 'string') {
        /* JSSTYLED */
        self.log.error("Algorithm '%s' does not have a name", fileName);
        return null;
    } else {
        /* JSSTYLED */
        self.log.info("Algorithm '%s' has been loaded", fileName);
        return algorithm;
    }
};



/*
 */

Algorithms.prototype._loadFlow =
function (flowDescription, algorithmLookup) {
    var self = this;
    var flow = [];

    var errExit = function (errMsg) {
        self.log.error('Bad flow given: ' + errMsg);
        process.exit(1);
    };

    var command = flowDescription[0];

    if (command !== 'pipe' && command !== 'or')
        errExit('invalid command: ' + command);

    if ((command === 'pipe' && flowDescription.length < 2) ||
        (command ===   'or' && flowDescription.length < 3))
        errExit('sexp too short for given command: ' + command);

    flow.push(command);

    for (var i = 1; i !== flowDescription.length; i++) {
        var element = flowDescription[i];

        if (Array.isArray(element)) {
            var subflow = self._loadFlow(element, algorithmLookup);
            flow.push(subflow);
        } else if (typeof (element) !== 'string') {
            errExit('invalid element: ' + element);
        } else {
            var algorithm = algorithmLookup[element];
            if (!algorithm)
                errExit('Unrecognized algorithm: ' + element);

            flow.push(algorithm);
        }
    }

    return flow;
};
