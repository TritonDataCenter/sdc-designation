/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns a server given a tree of plugins to select the server. Each
 * plugin contains an algorithm and takes a list of servers, processes the list,
 * then returns a new list. The new list is fed to the next plugin, which does
 * the same.
 *
 * All plugins accept four arguments, and return two values. The arguments
 * consist of: log, state, servers, constraints. 'log' is what each plugin will
 * use for the logging of info, warning or error messages. 'state' is a hash
 * which each plugin can use for passing metadata between plugins or maintaining
 * data between requests (but only with process lifetime). 'servers' is an array
 * of servers left from the previous plugin. 'constraints' contains various
 * restrictions which must be maintained when selecting eligible servers.
 *
 * All plugins return two values: servers, reasons. 'servers' is an array of
 * servers that the plugin deems acceptable for allocation. 'reasons' is a hash
 * with a textual description of why any server was removed by that plugin. Note
 * that some plugins don't return hashes, since their filtering is boolean in
 * nature, thus it should be obvious why a server was removed.
 *
 * Plugins form a tree, much like s-exps, where they form an expression. An
 * example of such an expression:
 *
 * ['pipe', <plugin 1>,
 *		  ['or', <plugin 2>,
 *				 <plugin 3>],
 *		  <plugin 4>]
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

var mod_fs = require('fs');
var create_uuid = require('node-uuid');

var ALGORITHMS_PATH = __dirname + '/algorithms/';

var DEFAULT_DESC = [
	// keep hard-filter-setup, hard-filter-running and
	// hard-filter-invalid-servers before any other plugins to avoid them
	// possibly getting confused over missing values
	'pipe', 'hard-filter-setup',
		'hard-filter-running',
		'hard-filter-invalid-servers',
		'calculate-ticketed-vms',
		'calculate-locality',
		'hard-filter-reserved',
		'hard-filter-headnode',
		'hard-filter-vlans',
		'hard-filter-platform-versions',
		'hard-filter-traits',
		'hard-filter-sick-servers',
		'calculate-recent-vms',
		'calculate-server-unreserved',
		'hard-filter-overprovision-ratios',
		'hard-filter-min-ram',
		'hard-filter-min-disk',
		'hard-filter-min-cpu',
		['or', 'hard-filter-reservoir',
			'identity'],
		['or', 'hard-filter-large-servers',
			'identity'
		],
		'soft-filter-locality-hints',
		'sort-min-ram',
		'sort-min-owner',
		'sort-random',
		'pick-weighted-random'
];

var SERVER_CAPACITY_DESC = [
	'pipe', 'hard-filter-setup',
		'hard-filter-running',
		'hard-filter-invalid-servers',
		'calculate-server-unreserved'
];

var DEFAULT_SPREAD = 'min-ram';

/* data preserved across objects */
var state = {};			/* plugin state lives between requests here */
var availableAlgorithms;	/* what's available for use */

/*
 * Creates an Algorithm class that allocates according to the provided
 * description. It falls back to a sane default if no description provided.
 *
 * WARNING: this class is currently designed to initialize only on program
 * startup: it blocks on loading algorithm files, and terminates the program
 * when given a bad description.
 */
var Allocator = module.exports = function (log, description)
{
	this.log = log;

	if (!availableAlgorithms)
		availableAlgorithms = this._loadAvailableAlgorithms();

	if (!description) {
		description = DEFAULT_DESC;
		log.info('No algorithm description given, using default');
	}

	/*
	 * XXX Temporary workaround for inadequate configurability.
	 */
	this.overprovision_ratios = this._loadOverprovisionRatios();

	this.allocServerExpr = this._createExpression(description,
	    availableAlgorithms);

	this.serverCapacityExpr = this._createExpression(SERVER_CAPACITY_DESC,
	    availableAlgorithms);
};

/*
 * Takes a list of servers, and applies the algorithms to the list of servers to
 * select one for this allocation.
 */
Allocator.prototype.allocate =
    function (servers, vm, img, pkg, tickets, checkCapacity)
{
	var self = this;
	var constraints;
	var result;
	var server;
	var visitedAlgorithms;
	var remainingServers;
	var reasonsRemoved;
	var stepSummary;

	pkg = self._massagePkgData(pkg);

	self.log.trace('State before expression: ', state);

	constraints = {
		vm: vm,
		img: img,
		pkg: pkg,
		tickets: tickets,
		capacity: checkCapacity
	};

	result = self._dispatch(self.allocServerExpr, servers, constraints);

	server = result[0][0];
	visitedAlgorithms = result[1];
	remainingServers = result[2];
	reasonsRemoved = result[3];

	stepSummary = self._createPluginSummary(servers,
	    visitedAlgorithms, remainingServers, reasonsRemoved);

	self._cleanup(visitedAlgorithms, server, servers, constraints);

	self.log.trace('State after expression: ', state);

	return ([server, stepSummary]);
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
Allocator.prototype.packageCapacity = function (servers, images, packages)
{
	var self = this;

	var MiB = 1024 * 1024;
	var nullUuid = '00000000-0000-0000-0000-000000000000';
	var capacities = [];
	var tickets = [];

	packages = packages.filter(function (pkg) {return (pkg.active); });
	images = images.filter(function (img) {
		return (img.state === 'active');
	});

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

			for (var i = 0; ; i++) {
				var brand = img.type === 'zvol' ?
				    'kvm' : 'smartos';

				var vm = {
					vm_uuid: create_uuid(),
					owner_uuid: pkg.owner_uuid || nullUuid,
					ram: pkg.max_physical_memory,
					cpu_cap: pkg.cpu_cap,
					quota: pkg.quota,
					brand: brand,
					state: 'running',
					last_modified: new Date().toISOString()
				};

				var server = self.allocate(simServers,
				    vm, img, pkg, tickets, true)[0];

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
					var imgSize;

					server.disk_kvm_zvol_volsize_bytes +=
					    vm.quota * MiB;
					vm.max_physical_memory = vm.ram + 1024;

					imgSize = img.image_size || 0;
					server.disk_kvm_zvol_volsize_bytes +=
					    imgSize * MiB;
				} else {
					server.disk_zone_quota_bytes +=
					    vm.quota * MiB;
					vm.max_physical_memory = vm.ram;
				}

				vm.quota /= 1024;	/* MiB -> GiB */
				vm.state = 'running';
				vm.uuid = vm.vm_uuid;
				delete vm.vm_uuid;

				server.vms[vm.uuid] = vm;
			}
		});
	});

	return (capacities);
};

/*
 * Determine how much free capacity is available on a group of servers. We
 * invoke some of the same algorithms used during allocation to ensure we're
 * returning valid data.
 *
 * Returns the spare CPU (in units of cpu_cap), RAM (in MiB), and disk (in MiB).
 * If a server isn't setup or valid, the reason for it being removed is also
 * indicated.
 *
 * WARNING: this function assumes that all algorithms in serverCapacityExpr do
 * not modify state or invoke cleanup.
 */
Allocator.prototype.serverCapacity = function (servers)
{
	var self = this;
	var result = self._dispatch(self.serverCapacityExpr, servers, {});
	var reasonsRemoved;
	var serversUnreserved;
	var reasons;

	servers = result[0];
	reasonsRemoved = result[3];

	/* extract unreserved_ values from each server */
	serversUnreserved = {};
	servers.forEach(function (server) {
		serversUnreserved[server.uuid] = {
			cpu: server.unreserved_cpu,	/* centi-CPUs */
			ram: server.unreserved_ram,	/* MiB */
			disk: server.unreserved_disk	/* MiB */
		};
	});

	/* merge all the reasons (why a server was removed) hashes into one */
	reasons = {};
	reasonsRemoved.forEach(function (serverReasons) {
		for (var key in serverReasons) {
			reasons[key] = serverReasons[key];
		}
	});

	return ([serversUnreserved, reasons]);
};

/*
 * Takes an array of plugins with a command prefix, and dispatches the array
 * of plugins to a function that can handle the command prefix. There are
 * two recognized commands: 'pipe' and 'or'.
 */
Allocator.prototype._dispatch = function (algorithms, servers, constraints)
{
	var self = this;
	var result;
	var command;

	/* we don't use shift(), to avoid modifying the referenced object */
	command = algorithms[0];
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

	return (result);
};

/*
 * Takes an array of plugins, and forms a pipeline between all of them. A list
 * of servers is fed in to the first plugin, the servers the first plugin
 * returns are fed to the second plugin, and so on; this continues until all
 * plugins (or sub-expressions) are run, or until a plugin returns no servers.
 */
Allocator.prototype._pipe = function (algorithms, servers, constraints)
{
	var self = this;
	var log = self.log;
	var visitedAlgorithms = [];
	var remainingServers = [];
	var reasonsRemoved = [];

	for (var i = 0; i < algorithms.length && servers.length !== 0; i++) {
		var algorithm = algorithms[i];
		var startTime;
		var reasons;
		var serverUuids;
		var timeElapsed;

		if (Array.isArray(algorithm)) {
			var results = self._dispatch(algorithm,
			    servers, constraints);
			servers = results[0];
			visitedAlgorithms =
			    visitedAlgorithms.concat(results[1]);
			remainingServers = remainingServers.concat(results[2]);
			reasonsRemoved = reasonsRemoved.concat(results[3]);
			continue;
		}

		if (constraints.capacity && !algorithm.affectsCapacity)
			continue;

		startTime = new Date();

		results = algorithm.run(log, state, servers, constraints);
		servers = results[0];
		reasons = results[1];

		visitedAlgorithms.push(algorithm);
		reasonsRemoved.push(reasons);

		serverUuids = servers.map(function (s) { return s.uuid; });
		remainingServers.push(serverUuids);

		timeElapsed = Math.floor(new Date() - startTime);
		log.debug({ serverUuids: serverUuids },
		    '%s returned %d server(s) in %d ms',
		    algorithm.name, serverUuids.length, timeElapsed);
	}

	return ([ servers, visitedAlgorithms,
	    remainingServers, reasonsRemoved ]);
};

/*
 * Takes an array of plugins, and feeds the list of servers to each plugin in
 * turn until a plugin returns a non-empty list of servers.
 */
Allocator.prototype._or = function (algorithms, initialServers, constraints)
{
	var self = this;
	var log = self.log;
	var visitedAlgorithms = [];
	var remainingServers = [];
	var reasonsRemoved = [];
	var servers = [];

	for (var i = 0; i < algorithms.length; i++) {
		var algorithm = algorithms[i];

		if (Array.isArray(algorithm)) {
			var results = self._dispatch(algorithm,
			    initialServers, constraints);
			servers = results[0];
			visitedAlgorithms =
			    visitedAlgorithms.concat(results[1]);
			remainingServers = remainingServers.concat(results[2]);
			reasonsRemoved = reasonsRemoved.concat(results[3]);
		} else {
			var startTime;
			var result;
			var reasons;
			var serverUuids;
			var timeElapsed;

			if (constraints.capacity && !algorithm.affectsCapacity)
				continue;

			startTime = new Date();

			result = algorithm.run(log, state,
			    initialServers, constraints);
			servers = result[0];
			reasons = result[1];

			visitedAlgorithms.push(algorithm);
			reasonsRemoved.push(reasons);

			serverUuids = servers.map(function (s) {
				return (s.uuid);
			});
			remainingServers.push(serverUuids);

			timeElapsed = Math.floor(new Date() - startTime);
			log.debug({ serverUuids: serverUuids },
			    '%s returned %d server(s) in %d ms',
			    algorithm.name, serverUuids.length, timeElapsed);
		}

		if (servers.length > 0)
			break;
	}

	return ([ servers, visitedAlgorithms,
	    remainingServers, reasonsRemoved ]);
};

/*
 * Takes a list of all plugins that were visited during allocation, and executes
 * the post() function on each one once.
 */
Allocator.prototype._cleanup =
function (visitedAlgorithms, server, servers, constraints)
{
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
function (servers, visitedAlgorithms, remainingServers, reasonsRemoved)
{
	var steps = [];
	var initialServerUuids = servers.map(function (s) { return (s.uuid); });

	steps.push({ step: 'Received by DAPI', remaining: initialServerUuids });

	for (var i = 0; i < visitedAlgorithms.length; i++) {
		var algoName = visitedAlgorithms[i].name;
		var remaining = remainingServers[i];
		var reasons = reasonsRemoved[i];
		var step = { step: algoName, remaining: remaining };

		if (reasons && Object.keys(reasons).length !== 0)
			step.reasons = reasons;

		steps.push(step);
	}

	return (steps);
};

/*
 * If a requested package has no overprovision attributes, we treat it as if it
 * had an overprovision_ram of 1.0 (RAM won't overprovision, but other resources
 * can). It's up to the caller to ensure the requested cpu_cap/ram/disk are
 * properly balanced to prevent actual overprovisioning... unless that's their
 * intent.
 */
Allocator.prototype._massagePkgData = function (pkg)
{
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

	pkg.alloc_server_spread = pkg.alloc_server_spread || DEFAULT_SPREAD;

	return (pkg);
};

/*
 * Loads all algorithms in the algorithms/ directory. These can then be using
 * when constructing an expression tree according to a provided description.
 */
Allocator.prototype._loadAvailableAlgorithms = function ()
{
	var self = this;

	var algoNames = [];
	var loadedAlgorithms = {};

	var files = mod_fs.readdirSync(ALGORITHMS_PATH);
	var algorithmFiles = files.filter(function (file) {
		return (file.match(/\.js$/));
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

	return (loadedAlgorithms);
};

/*
 * Temporary hack, until CNAPI supports overprovision_ratios, or until a better
 * overprovisioning comes along.
 *
 * For now, loads a ratio.json of a format similar to the following:
 *
 *  {
 *	  "f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b": { "ram": 1.5 },
 *	  "0e07ab09-d725-436f-884a-759fa3ed7183": {
 *		  "ram": 2.0, "disk": 1.0, "cpu": 1.0, "io": 1.0, "net": 2.5
 *	  }
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

Allocator.prototype._loadOverprovisionRatios = function ()
{
	var self = this;
	var ratios;
	var uuids;

	try {
		var ratioJson =
		    mod_fs.readFileSync(__dirname + '/../ratio.json', 'ascii');
	} catch (e) {
		if (e.code == 'ENOENT') {
			self.log.info('ratio.json not found');
			return (null);
		}

		throw (e);
	}

	ratios = JSON.parse(ratioJson);

	uuids = Object.keys(ratios);
	uuids.forEach(function (uuid) {
		var ratio;

		if (!uuid.match(UUID_RE)) {
			throw (uuid + ' is unrecognized');
		}

		ratio = ratios[uuid];
		if (typeof (ratio) !== 'object')
			throw ('ratio in ' + uuid + ' is not an object');

		Object.keys(ratio).forEach(function (key) {
			var r;

			if (VALID_OVERPROVISION_RESOURCES.indexOf(key) == -1)
				throw ('ratio ' + key + ' is unrecognized');

			r = ratio[key];
			if (typeof (r) != 'number' && r !== null) {
				throw ('attribute ' +
				    r + ' for ratio is unrecognized');
			}
		});
	});

	return (ratios);
};

/*
 * Load an algorithm from a file. Return the algorithm if valid.
 */
Allocator.prototype._loadAlgorithm = function (shortName)
{
	var self = this;
	var algoPath = ALGORITHMS_PATH + shortName;

	var algorithm = require(algoPath);

	if (!algorithm.run || typeof (algorithm.run) !== 'function') {
		self.log.error('Algorithm "%s" does not have a run function',
		    shortName);
		return (null);
	} else if (!algorithm.name || typeof (algorithm.name) != 'string') {
		self.log.error('Algorithm "%s" does not have a name',
		    shortName);
		return (null);
	} else {
		self.log.debug('Algorithm "%s" has been loaded', shortName);
		return (algorithm);
	}
};

/*
 * Given an expression description, and available algorithms, construct an
 * expression which can be interpreted for allocation.
 */
Allocator.prototype._createExpression = function (description, algorithmLookup)
{
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

	return (expression);
};

/*
 * Deep copies a an object. This method assumes an acyclic graph.
 */
Allocator.prototype._deepCopy = function (obj)
{
	var self = this;
	var type = typeof (obj);

	if (type == 'object') {
		var clone;

		if (obj === null)
			return (null);

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
