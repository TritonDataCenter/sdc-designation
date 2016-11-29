/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns a server given a tree of plugins to select the server. Each
 * plugin contains an algorithm and takes a list of servers, processes the list,
 * then returns a new list. The new list is fed to the next plugin, which does
 * the same.
 *
 * All plugins accept four arguments, and return two values. The arguments
 * consist of: log, servers, constraints. 'log' is what each plugin will
 * use for the logging of info, warning or error messages. 'servers' is an array
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
 */

var mod_fs = require('fs');

var ALGORITHMS_PATH = __dirname + '/algorithms/';

var SERVER_CAPACITY_DESC = [
	'pipe', 'hard-filter-setup',
		'hard-filter-running',
		'hard-filter-invalid-servers',
		'calculate-server-unreserved'
];


/* data preserved across objects */
var availableAlgorithms;	/* what's available for use */

/*
 * Creates an Algorithm class that allocates according to the provided
 * description. It falls back to a sane default if no description provided.
 *
 * WARNING: this class is currently designed to initialize only on program
 * startup: it blocks on loading algorithm files, and terminates the program
 * when given a bad description.
 */
var Allocator = module.exports = function (log, description, defaults)
{
	this.log = log;
	this.defaults = defaults;

	if (!availableAlgorithms)
		availableAlgorithms = this._loadAvailableAlgorithms();

	this.allocServerExpr = this._createExpression(description,
	    availableAlgorithms);

	this.serverCapacityExpr = this._createExpression(SERVER_CAPACITY_DESC,
	    availableAlgorithms);
};

/*
 * Takes a list of servers, and applies the algorithms to the list of servers to
 * select one for this allocation.
 */
Allocator.prototype.allocate = function (servers, vm, img, pkg, tickets)
{
	var self = this;
	var constraints;
	var result;
	var server;
	var visitedAlgorithms;
	var remainingServers;
	var reasonsRemoved;
	var stepSummary;

	if (pkg) {
		pkg = self._massagePkgData(pkg);
	}

	constraints = {
		vm: vm,
		img: img,
		pkg: pkg,
		tickets: tickets,
		defaults: self.defaults
	};

	servers.forEach(function (s) {
		s.score = 0;
	});

	result = self._dispatch(self.allocServerExpr, servers, constraints);

	// get server with highest score
	if (result[0].length > 1) {
		server = result[0].reduce(function (s1, s2) {
			return (s1.score > s2.score ? s1 : s2);
		});
	} else {
		server = result[0][0];
	}

	visitedAlgorithms = result[1];
	remainingServers = result[2];
	reasonsRemoved = result[3];

	stepSummary = self._createPluginSummary(servers,
	    visitedAlgorithms, remainingServers, reasonsRemoved);

	return ([server, stepSummary]);
};


/*
 * Determine how much free capacity is available on a group of servers. We
 * invoke some of the same algorithms used during allocation to ensure we're
 * returning valid data.
 *
 * Returns the spare CPU (in units of cpu_cap), RAM (in MiB), and disk (in MiB).
 * If a server isn't setup or valid, the reason for it being removed is also
 * indicated.
 */
Allocator.prototype.serverCapacity = function (servers)
{
	var self = this;

	servers.forEach(function (s) {
		s.score = 0;
	});

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

		startTime = new Date();

		results = algorithm.run(log, servers, constraints);
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

			startTime = new Date();

			result = algorithm.run(log,
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
