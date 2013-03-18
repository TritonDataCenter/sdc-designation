/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a server given a tree of plugins to select the server. Each
 * plugin contains an algorithm and takes a list of servers, processes the list,
 * then returns a new list. The new list is fed to the next plugin, which does
 * the same.
 *
 * An example description of an expression, forming a tree:
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
var DEFAULT_DESC = [
    'pipe', 'hard-filter-min-ram',
            'hard-filter-running',
            'hard-filter-setup',
            'hard-filter-reserved',
            'hard-filter-headnode',
            'hard-filter-platform-versions',
            'hard-filter-traits',
            'soft-filter-recent-servers',
            ['or', 'hard-filter-large-servers',
                   'identity'],
            ['or', 'hard-filter-owner-same-racks',
                   'hard-filter-owner-same-servers',
                   'soft-filter-owner-many-zones'],
            'sort-min-ram',
            'pick-weighted-random'
];

// data preserved across objects
var state = {};          // plugin state lives between requests here
var availableAlgorithms; // what's available for use



/*
 * Creates an Algorithm class that allocates according to the provided
 * description. It falls back to a sane default if no description provided.
 *
 * WARNING: this class is currently designed to initialize only on program
 * startup: it blocks on loading algorithm files, and terminates the program
 * when given a bad description.
 */

var Allocator = module.exports =
function (log, description) {
    this.log = log;

    if (!availableAlgorithms)
        availableAlgorithms = this._loadAvailableAlgorithms();

    if (!description) {
        description = DEFAULT_DESC;
        log.info('No algorithm description given, using default');
    }

    this.expression = this._createExpression(description, availableAlgorithms);
};



/*
 * Takes a list of servers, and applies the algorithms to the list of servers to
 * select one for this allocation.
 */

Allocator.prototype.allocate =
function (servers, vmDetails, imgDetails) {
    var self = this;

    servers = self._massageServerData(servers);

    self.log.trace('State before expression: ', state);

    var result = self._dispatch(self.expression, servers, vmDetails,
                                imgDetails);
    var server = result[0][0];
    var visitedAlgorithms = result[1];

    self._cleanup(visitedAlgorithms, server, servers, vmDetails, imgDetails);

    self.log.trace('State after expression: ', state);

    return server;
};



/*
 * Takes an array of plugins with a command prefix, and dispatches the array
 * of plugins to a function that can handle the command prefix. There are
 * two recognized commands: 'pipe' and 'or'.
 */

Allocator.prototype._dispatch =
function (algorithms, servers, vmDetails, imgDetails) {
    var self = this;
    var result;

    // we don't use shift(), to avoid modifying the referenced object
    var command = algorithms[0];
    algorithms = algorithms.slice(1, algorithms.length);

    if (self.log.trace() && (command === 'pipe' || command === 'or')) {
        self.log.trace('Dispatching on "' + command + '"');
    }

    if (command === 'pipe') {
        result = self._pipe(algorithms, servers, vmDetails, imgDetails);
    } else if (command === 'or') {
        result = self._or(algorithms, servers, vmDetails, imgDetails);
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

Allocator.prototype._pipe =
function (algorithms, servers, vmDetails, imgDetails) {
    var self = this;
    var log = self.log;
    var visitedAlgorithms = [];

    for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            var results = self._dispatch(algorithm, servers, vmDetails,
                                         imgDetails);
            servers = results[0];
            visitedAlgorithms.concat(results[1]);
            continue;
        }

        var localState = state[algorithm.name];

        if (!localState)
            localState = state[algorithm.name] = {};

        if (log.debug())
            var startTime = new Date();

        servers = algorithm.run(log, localState, servers, vmDetails,
                                imgDetails);
        visitedAlgorithms.push(algorithm);

        if (log.debug()) {
            var serverUuids = servers.map(function (s) { return s.uuid; });
            var timeElapsed = Math.floor(new Date() - startTime);

            log.debug({ serverUuids: serverUuids },
                      '%s returned %d server(s) in %d ms',
                      algorithm.name, serverUuids.length, timeElapsed);
        }
    }

    return [ servers, visitedAlgorithms ];
};



/*
 * Takes an array of plugins, and feeds the list of servers to each plugin in
 * turn until a plugin returns a non-empty list of servers.
 */

Allocator.prototype._or =
function (algorithms, initialServers, vmDetails, imgDetails) {
    var self = this;
    var log = self.log;
    var visitedAlgorithms = [];
    var servers = [];

    for (var i = 0; i < algorithms.length; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            var results = self._dispatch(algorithm, initialServers, vmDetails,
                                         imgDetails);
            servers = results[0];
            visitedAlgorithms.concat(results[1]);
        } else {
            var localState = state[algorithm.name];

            if (!localState)
                localState = state[algorithm.name] = {};

            if (log.debug())
                var startTime = new Date();

            servers = algorithm.run(log, localState, initialServers, vmDetails,
                                    imgDetails);
            visitedAlgorithms.push(algorithm);

            if (log.debug()) {
                var serverUuids = servers.map(function (s) { return s.uuid; });
                var timeElapsed = Math.floor(new Date() - startTime);

                log.debug({ serverUuids: serverUuids },
                          '%s returned %d server(s) in %d ms',
                          algorithm.name, serverUuids.length, timeElapsed);
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

Allocator.prototype._cleanup =
function (visitedAlgorithms, server, origServers, vmDetails, imgDetails) {
    var self = this;
    var log = self.log;
    var alreadyRun = {};

    for (var i = visitedAlgorithms.length - 1; i >= 0; i--) {
        var algorithm = visitedAlgorithms[i];

        if (!algorithm.post || alreadyRun[algorithm.name])
            continue;

        var localState = state[algorithm.name];
        algorithm.post(log, localState, server, origServers, vmDetails,
                       imgDetails);

        alreadyRun[algorithm.name] = true;

        log.trace('Invoked post-alloc callback for %s', algorithm.name);
    }
};



/*
 * Computes what the unreserved RAM and disk on each server so that plugins
 * don't have to (unreserved RAM being commonly used by plugins).
 */

Allocator.prototype._massageServerData =
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
            server.unreserved_disk -= vm.quota * 1024;  // to mb
            server.unreserved_ram  -= vm.max_physical_memory;
        }

        server.unreserved_disk = Math.floor(server.unreserved_disk);
        server.unreserved_ram  = Math.floor(server.unreserved_ram);
    }

    return servers;
};



/*
 * Loads all algorithms in the algorithms/ directory. These can then be using
 * when constructing an expression tree according to a provided description.
 */

Allocator.prototype._loadAvailableAlgorithms =
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
            var lookupName = fileName.split('.js')[0];
            loadedAlgorithms[lookupName] = algorithm;
            algoNames.push(algorithm.name);
        }
    });

    self.log.info('Loaded the following algorithms: ', algoNames);

    return loadedAlgorithms;
};



/*
 * Load an algorithm from a file. Return the algorithm if valid.
 */

Allocator.prototype._loadAlgorithm =
function (shortName) {
    var self = this;
    var algoPath = ALGORITHMS_PATH + shortName;

    var algorithm = require(algoPath);

    if (!algorithm.run || typeof (algorithm.run) !== 'function') {
        /* JSSTYLED */
        self.log.error("Algorithm '%s' does not have a run function",
                       shortName);
        return null;
    } else if (!algorithm.name || typeof (algorithm.name) != 'string') {
        /* JSSTYLED */
        self.log.error("Algorithm '%s' does not have a name", shortName);
        return null;
    } else {
        /* JSSTYLED */
        self.log.info("Algorithm '%s' has been loaded", shortName);
        return algorithm;
    }
};



/*
 * Given an expression description, and available algorithms, construct an
 * expression which can be interpreted for allocation.
 */

Allocator.prototype._createExpression =
function (description, algorithmLookup) {
    var self = this;
    var expression = [];

    var errExit = function (errMsg) {
        self.log.error('Bad expression given: ' + errMsg);
        process.exit(1);
    };

    var command = description[0];

    if (command !== 'pipe' && command !== 'or')
        errExit('Invalid command: ' + command);

    if ((command === 'pipe' && description.length < 2) ||
        (command ===   'or' && description.length < 3))
        errExit('sexp too short for given command: ' + command);

    expression.push(command);

    for (var i = 1; i !== description.length; i++) {
        var element = description[i];

        if (Array.isArray(element)) {
            var subexpression = self._createExpression(element,
                                                       algorithmLookup);
            expression.push(subexpression);
        } else if (typeof (element) !== 'string') {
            errExit('Invalid element: ' + element);
        } else {
            var algorithm = algorithmLookup[element];
            if (!algorithm)
                errExit('Unrecognized algorithm: ' + element);

            expression.push(algorithm);
        }
    }

    return expression;
};
