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
var createUuid = require('node-uuid');



var ALGORITHMS_PATH = __dirname + '/algorithms/';
var DEFAULT_DESC = [
    // keep hard-filter-invalid-servers and filter-setup before any other
    // plugins to avoid them possibly getting confused over missing values
    'pipe', 'hard-filter-invalid-servers',
            'hard-filter-setup',
            'calculate-server-unreserved',
            'calculate-locality',
            'hard-filter-reserved',
            'hard-filter-headnode',
            'hard-filter-running',
            'hard-filter-platform-versions',
            'hard-filter-traits',
            'hard-filter-overprovision-ratios',
            ['or', ['pipe', 'hard-filter-reservoir',
                            'hard-filter-min-ram',
                            'hard-filter-min-disk',
                            'hard-filter-min-cpu'],
                   ['pipe', 'hard-filter-min-ram',
                            'hard-filter-min-disk',
                            'hard-filter-min-cpu']],
            'soft-filter-recent-servers',
            ['or', 'hard-filter-large-servers',
                   'identity'],
            'soft-filter-locality-hints',
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

    // temporary hack
    this.overprovision_ratios = this._loadOverprovisionRatios();

    this.expression = this._createExpression(description, availableAlgorithms);
};



/*
 * Takes a list of servers, and applies the algorithms to the list of servers to
 * select one for this allocation.
 */

Allocator.prototype.allocate =
function (servers, vm, img, pkg) {
    var self = this;

    pkg = self._massagePkgData(pkg);

    self.log.trace('State before expression: ', state);

    var constraints = { vm: vm, img: img, pkg: pkg };
    var result = self._dispatch(self.expression, servers, constraints);
    var server = result[0][0];
    var visitedAlgorithms = result[1];
    var remainingServers = result[2];

    var stepSummary = self._createPluginSummary(servers, visitedAlgorithms,
                                                remainingServers);

    self._cleanup(visitedAlgorithms, server, servers, constraints);

    self.log.trace('State after expression: ', state);

    return [server, stepSummary];
};



/*
 * Takes a list of servers, images and packages, then runs a crude simulation
 * of a DC to determine how many zones of each (package, image) pair can be
 * allocated. This gives an idea of how much free space there is in a DC,
 * ignoring networking.
 *
 * We perform the simulation by taking the DC (the servers) in its current
 * state, then keep allocating each (package, image) pair until it's no longer
 * possible to allocate any further. Then we start fresh again with a different
 * pair.
 */

Allocator.prototype.capacity =
function (servers, images, packages) {
    var self = this;

    var MiB = 1024 * 1024;
    var nullUuid = '00000000-0000-0000-0000-000000000000';
    var capacities = [];

    packages = packages.filter(function (pkg) { return pkg.active; });
    images = images.filter(function (img) {return img.state === 'active'; });

    if (images.length === 0) {
        images = [ {
            uuid: nullUuid,
            image_size: 0,
            os: 'smartos'
        } ];
    }

    packages.forEach(function (pkg) {
        images.forEach(function (img) {
            var simServers = self._deepCopy(servers);

            for (var i = 0; true; i++) {
                var brand = img.type === 'zvol' ? 'kvm' : 'smartos';

                var vm = {
                    owner_uuid: pkg.owner_uuid || nullUuid,
                    ram: pkg.max_physical_memory,
                    cpu_cap: pkg.cpu_cap,
                    quota: pkg.quota,
                    brand: brand
                };

                var server = self.allocate(simServers, vm, img, pkg)[0];

                if (!server) {
                    capacities.push({
                        package_uuid: pkg.uuid,
                        package_name: pkg.name,
                        package_version: pkg.version,
                        image_uuid: img.uuid,
                        image_name: img.name,
                        image_version: img.version,
                        slots: i
                    });

                    break;
                }

                if (img.type === 'zvol') {
                    server.disk_kvm_zvol_volsize_bytes += vm.quota * MiB;
                    vm.max_physical_memory = vm.ram + 1024;

                    var imgSize = img.image_size;
                    if (imgSize)
                        server.disk_kvm_zvol_volsize_bytes += imgSize * MiB;
                } else {
                    server.disk_zone_quota_bytes += vm.quota * MiB;
                    vm.max_physical_memory = vm.ram;
                }

                vm.uuid = createUuid();
                vm.quota /= 1024; // convert to GiB
                vm.state = 'running';

                server.vms[vm.uuid] = vm;
            }
        });
    });

    return capacities;
};



/*
 * Takes an array of plugins with a command prefix, and dispatches the array
 * of plugins to a function that can handle the command prefix. There are
 * two recognized commands: 'pipe' and 'or'.
 */

Allocator.prototype._dispatch =
function (algorithms, servers, constraints) {
    var self = this;
    var result;

    // we don't use shift(), to avoid modifying the referenced object
    var command = algorithms[0];
    algorithms = algorithms.slice(1, algorithms.length);

    if (command === 'pipe' || command === 'or')
        self.log.trace('Dispatching on "' + command + '"');

    if (command === 'pipe') {
        result = self._pipe(algorithms, servers, constraints);
    } else if (command === 'or') {
        result = self._or(algorithms, servers, constraints);
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
function (algorithms, servers, constraints) {
    var self = this;
    var log = self.log;
    var visitedAlgorithms = [];
    var remainingServers = [];

    for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            var results = self._dispatch(algorithm, servers, constraints);
            servers = results[0];
            visitedAlgorithms = visitedAlgorithms.concat(results[1]);
            remainingServers = remainingServers.concat(results[2]);
            continue;
        }

        var startTime = new Date();

        servers = algorithm.run(log, state, servers, constraints);
        visitedAlgorithms.push(algorithm);

        var serverUuids = servers.map(function (s) { return s.uuid; });
        remainingServers.push(serverUuids);

        var timeElapsed = Math.floor(new Date() - startTime);
        log.debug({ serverUuids: serverUuids },
                  '%s returned %d server(s) in %d ms',
                  algorithm.name, serverUuids.length, timeElapsed);
    }

    return [ servers, visitedAlgorithms, remainingServers ];
};



/*
 * Takes an array of plugins, and feeds the list of servers to each plugin in
 * turn until a plugin returns a non-empty list of servers.
 */

Allocator.prototype._or =
function (algorithms, initialServers, constraints) {
    var self = this;
    var log = self.log;
    var visitedAlgorithms = [];
    var remainingServers = [];
    var servers = [];

    for (var i = 0; i < algorithms.length; i++) {
        var algorithm = algorithms[i];

        if (Array.isArray(algorithm)) {
            var results = self._dispatch(algorithm, initialServers,
                                         constraints);
            servers = results[0];
            visitedAlgorithms = visitedAlgorithms.concat(results[1]);
            remainingServers = remainingServers.concat(results[2]);
        } else {
            var startTime = new Date();

            servers = algorithm.run(log, state, initialServers, constraints);
            visitedAlgorithms.push(algorithm);

            var serverUuids = servers.map(function (s) { return s.uuid; });
            remainingServers.push(serverUuids);

            var timeElapsed = Math.floor(new Date() - startTime);
            log.debug({ serverUuids: serverUuids },
                      '%s returned %d server(s) in %d ms',
                      algorithm.name, serverUuids.length, timeElapsed);
        }

        if (servers.length > 0)
            break;
    }

    return [ servers, visitedAlgorithms, remainingServers ];
};



/*
 * Takes a list of all plugins that were visited during allocation, and executes
 * the post() function on each one once.
 */

Allocator.prototype._cleanup =
function (visitedAlgorithms, server, servers, constraints) {
    var self = this;
    var log = self.log;
    var alreadyRun = {};

    for (var i = visitedAlgorithms.length - 1; i >= 0; i--) {
        var algorithm = visitedAlgorithms[i];

        if (!algorithm.post || alreadyRun[algorithm.name])
            continue;

        algorithm.post(log, state, server, servers, constraints);

        alreadyRun[algorithm.name] = true;

        log.trace('Invoked post-alloc callback for %s', algorithm.name);
    }
};



/*
 * Creates an array which lists the algorithm name that was run at each step,
 * and the server UUIDs that were returned by that algorithm. This is useful as
 * a summary of what DAPI did to reach the result.
 */

Allocator.prototype._createPluginSummary =
function (servers, visitedAlgorithms, remainingServers) {
    var steps = [];

    var initialServerUuids = servers.map(function (s) { return s.uuid; });
    steps.push({ step:      'Received by DAPI',
                 remaining: initialServerUuids });

    for (var i = 0; i < visitedAlgorithms.length; i++) {
        var algoName  = visitedAlgorithms[i].name;
        var remaining = remainingServers[i];

        steps.push({ step:      algoName,
                     remaining: remaining });
    }

    return steps;
};



/*
 * If a requested package has no overprovision attributes, we treat it as if it
 * had an overprovision_ram of 1.0 (RAM won't overprovision, but other resources
 * can). It's up to the caller to ensure the requested cpu_cap/ram/disk are
 * properly balanced to prevent actual overprovisioning... unless that's their
 * intent.
 */

Allocator.prototype._massagePkgData =
function (pkg) {
    if (pkg.overprovision_cpu)
        pkg.overprovision_cpu = +pkg.overprovision_cpu;

    if (pkg.overprovision_memory)
        pkg.overprovision_ram = +pkg.overprovision_memory;

    if (pkg.overprovision_storage)
        pkg.overprovision_disk = +pkg.overprovision_storage;

    if (pkg.overprovision_network)
        pkg.overprovision_net = +pkg.overprovision_network;

    if (pkg.overprovision_io)
        pkg.overprovision_io = +pkg.overprovision_io;

    delete pkg.overprovision_memory;
    delete pkg.overprovision_storage;
    delete pkg.overprovision_network;

    if (!(pkg.overprovision_cpu || pkg.overprovision_ram ||
          pkg.overprovision_disk || pkg.overprovision_io ||
          pkg.overprovision_net))
        pkg.overprovision_ram = 1.0;

    return pkg;
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
 * Temporary hack, until CNAPI supports overprovision_ratios, or until a better
 * overprovisioning comes along.
 *
 * For now, loads a ratio.json of a format similar to the following:
 *
 *  {
 *      "f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b": { "ram": 1.5 },
 *      "0e07ab09-d725-436f-884a-759fa3ed7183": {
 *          "ram": 2.0, "disk": 1.0, "cpu": 1.0, "io": 1.0, "net": 2.5
 *      }
 *  }
 *
 * The UUIDs are server UUIDs, and the keys and numbers represent how much a
 * given resource can be overprovisioned. 1.0 means no overprovisioning, 2.0
 * means that a zone is overprovisioned 2x for that resource, etc. If
 * overprovisioning for a given resource does not matter, leave out the
 * associated key (or use null as the value).
 */

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var VALID_OVERPROVISION_RESOURCES = ['cpu', 'ram', 'disk', 'io', 'net'];

Allocator.prototype._loadOverprovisionRatios =
function () {
    var self = this;

    try {
        var ratioJson = fs.readFileSync(__dirname + '/../ratio.json', 'ascii');
    } catch (e) {
        if (e.code == 'ENOENT') {
            self.log.info('ratio.json not found');
            return null;
        }

        throw (e);
    }

    var ratios = JSON.parse(ratioJson);

    var uuids = Object.keys(ratios);
    uuids.forEach(function (uuid) {
        if (!uuid.match(UUID_RE)) {
            throw (uuid + ' is unrecognized');
        }

        var ratio = ratios[uuid];
        if (typeof (ratio) !== 'object')
            throw ('ratio in ' + uuid + ' is not an object');

        Object.keys(ratio).forEach(function (key) {
            if (VALID_OVERPROVISION_RESOURCES.indexOf(key) == -1)
                throw ('ratio ' + key + ' is unrecognized');

            var r = ratio[key];
            if (typeof (r) != 'number' && r !== null)
                throw ('attribute ' + r + ' for ratio is unrecognized');
        });
    });

    return ratios;
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



/*
 * Deep copies a an object. This method assumes an acyclic graph.
 */

Allocator.prototype._deepCopy =
function (obj) {
    var self = this;
    var type = typeof (obj);

    if (type == 'object') {
      if (obj === null)
        return (null);

      var clone;
      if (obj instanceof Buffer) {
        clone = new Buffer(obj);

      } else if (Array.isArray(obj)) {
        clone = [];
        for (var i = obj.length - 1; i >= 0; i--) {
          clone[i] = self._deepCopy(obj[i]);
        }

      } else {
        clone = {};
        for (i in obj) {
          clone[i] = self._deepCopy(obj[i]);
        }
      }
      return (clone);

    } else {
      return (obj);
    }
};
