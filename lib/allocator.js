/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2019 Joyent, Inc.
 */

/*
 * Returns a server given a tree of plugins to select the server. Each
 * plugin contains an algorithm and takes a list of servers, processes the list,
 * then returns a new list. The new list is fed to the next plugin, which does
 * the same.
 *
 * All plugins accept four arguments, and return two values. The arguments
 * consist of: servers and opts. 'opts' contains various functions that plugins
 * often use, such as logging or loading VM information. It also contains
 * various restrictions which must be maintained when selecting eligible
 * servers. 'servers' is an array of servers left after the previous plugin.
 *
 * All plugins return three values: err, servers, reasons. 'servers' is an array
 * of servers that the plugin deems acceptable for allocation. 'reasons' is a
 * hash with a textual description of why any server was removed by that plugin,
 * although some plugins do not fill in the hash with such information because
 * the reasons for the filtering is obvious (e.g. the plugin is boolean).
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

var assert = require('assert-plus');
var mod_fs = require('fs');

var ALGORITHMS_PATH = __dirname + '/algorithms/';

var SERVER_CAPACITY_DESC = [
	'pipe', 'hard-filter-setup',
		'hard-filter-running',
		'hard-filter-invalid-servers',
		'load-server-vms',
		'override-overprovisioning',
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
var Allocator = module.exports = function (opts, description, defaults)
{
	assert.object(opts, 'opts');
	assert.object(opts.log, 'opts.log');
	assert.optionalFunc(opts.getVm, 'opts.getVm');
	assert.optionalFunc(opts.getServerVms, 'opts.getServerVm');
	assert.array(description, 'description');
	assert.object(defaults, 'defaults');

	this.log = opts.log;
	this.opts = opts;
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
Allocator.prototype.allocate = function (servers, vm, img, pkg, tickets, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(vm, 'vm');
	assert.object(img, 'img');
	assert.optionalObject(pkg, 'pkg');
	assert.array(tickets, 'tickets');
	assert.func(cb, 'cb');

	var self = this;

	if (pkg) {
		pkg = self._massagePkgData(pkg);
	}

	var opts = {
		vm: vm,
		img: img,
		pkg: pkg,
		tickets: tickets,
		defaults: self.defaults
	};

	Object.keys(self.opts).forEach(function (key) {
		opts[key] = opts[key] || self.opts[key];
	});

	servers.forEach(function (s) {
		s.score = 0;
	});

	self._dispatch(self.allocServerExpr, servers, opts,
			function (err, filteredServers, visitedAlgorithms,
			remainingServers, reasonsRemoved) {
		if (err) {
			return (cb(err));
		}

		// get server with highest score
		var server;
		if (filteredServers.length > 1) {
			server = filteredServers.reduce(function (s1, s2) {
				return (s1.score > s2.score ? s1 : s2);
			});
		} else {
			server = filteredServers[0];
		}

		var stepSummary = self._createPluginSummary(servers,
			visitedAlgorithms, remainingServers, reasonsRemoved);

		return (cb(null, server, stepSummary));
	});
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
Allocator.prototype.serverCapacity = function (servers, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.func(cb, 'func');

	var self = this;

	var opts = {
		defaults: self.defaults
	};

	Object.keys(self.opts).forEach(function (key) {
		opts[key] = opts[key] || self.opts[key];
	});

	servers.forEach(function (s) {
		s.score = 0;
	});

	self._dispatch(self.serverCapacityExpr, servers, opts,
			function (err, filteredServers, visitedAlgorithms,
			remainingServers, reasonsRemoved) {
		if (err) {
			return (cb(err));
		}

		/* extract unreserved_ values from each server */
		var serversUnreserved = {};
		filteredServers.forEach(function (server) {
			serversUnreserved[server.uuid] = {
				cpu: server.unreserved_cpu,	/* centi-CPUs */
				ram: server.unreserved_ram,	/* MiB */
				disk: server.unreserved_disk	/* MiB */
			};
		});

		/* merge all the reasons (why a server was removed) hashes */
		var reasons = {};
		reasonsRemoved.forEach(function (serverReasons) {
			for (var key in serverReasons) {
				reasons[key] = serverReasons[key];
			}
		});

		return (cb(err, serversUnreserved, reasons));
	});
};


/*
 * Takes an array of plugins with a command prefix, and dispatches the array
 * of plugins to a function that can handle the command prefix. There are
 * two recognized commands: 'pipe' and 'or'.
 *
 * When the command is 'pipe': forms a pipeline between all plugins. A list
 * of servers is fed in to the first plugin, the servers the first plugin
 * returns are fed to the second plugin, and so on; this continues until all
 * plugins (or sub-expressions) are run, or until a plugin returns no servers.
 *
 * When the command is 'or': feeds the same list of servers to each plugin in
 * turn until a plugin returns a non-empty list of servers.
 */
Allocator.prototype._dispatch =
function (algorithms, initialServers, opts, cb)
{
	assert.array(algorithms, 'algorithms');
	assert.arrayOfObject(initialServers, 'initialServers');
	assert.object(opts, 'opts');
	assert.object(opts.log, 'opts.log');
	assert.func(cb, 'cb');

	var self = this;
	var log = self.log;

	var visitedAlgos = [];
	var remainingServers = [];
	var reasons = [];
	var algorithm;
	var startTime;

	/* we don't use shift(), to avoid modifying the referenced object */
	var command = algorithms[0];
	log.trace('Dispatching on "' + command + '"');
	assert.ok(command === 'pipe' || command === 'or', 'command valid');
	algorithms = algorithms.slice(1, algorithms.length);

	function ranAlgorithms(err, servers, _visitedAlgos, _remainingServers,
			_reasons) {
		if (err) {
			return (cb(err));
		}

		visitedAlgos = visitedAlgos.concat(_visitedAlgos);
		remainingServers = remainingServers.concat(_remainingServers);
		reasons = reasons.concat(_reasons);

		return (step(servers));
	}

	function ranAlgorithm(err, servers, _reasons) {
		if (err) {
			return (cb(err));
		}

		reasons.push(_reasons);
		visitedAlgos.push(algorithm);

		var serverUuids = servers.map(function (s) {
			return (s.uuid);
		});
		remainingServers.push(serverUuids);

		var timeDelta = Math.floor(new Date() - startTime);
		log.debug({ serverUuids: serverUuids },
			'%s returned %d server(s) in %d ms',
			algorithm.name, serverUuids.length, timeDelta);

		return (step(servers));
	}

	var idx = 0;
	function step(stepServers) {
		if (idx === algorithms.length) {
			return (cb(null, stepServers, visitedAlgos,
				remainingServers, reasons));
		}

		if ((command === 'pipe' && stepServers.length === 0) ||
		    (command === 'or' && stepServers.length > 0)) {
			return (cb(null, stepServers, visitedAlgos,
				remainingServers, reasons));
		}

		algorithm = algorithms[idx];
		idx += 1;

		var argServers;
		if (command === 'pipe') {
			argServers = stepServers;
		} else { // command === 'or'
			argServers = initialServers;
		}

		if (Array.isArray(algorithm)) {
			self._dispatch(algorithm, argServers, opts,
				ranAlgorithms);
		} else {
			startTime = new Date();
			algorithm.run(argServers, opts, ranAlgorithm);
		}

		return (null); // to silence linter
	}

	if (command === 'pipe') {
		step(initialServers);
	} else { // command === 'or'
		step([]);
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
	assert.arrayOfObject(servers, 'servers');
	assert.arrayOfObject(visitedAlgorithms, 'visitedAlgorithms');
	assert.arrayOfArray(remainingServers, 'remainingServers');
	assert.arrayOfObject(reasonsRemoved, 'reasonsRemoved');

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
	assert.object(pkg, 'pkg');

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
	assert.string(shortName, 'shortName');

	var self = this;
	var log = self.log;
	var algoPath = ALGORITHMS_PATH + shortName;

	var algorithm = require(algoPath);

	if (!algorithm.run || typeof (algorithm.run) !== 'function') {
		log.error('Algorithm "%s" does not have a run function',
		    shortName);
		return (null);
	} else if (!algorithm.name || typeof (algorithm.name) != 'string') {
		log.error('Algorithm "%s" does not have a name',
		    shortName);
		return (null);
	} else {
		log.debug('Algorithm "%s" has been loaded', shortName);
		return (algorithm);
	}
};


/*
 * Given an expression description, and available algorithms, construct an
 * expression which can be interpreted for allocation.
 */
Allocator.prototype._createExpression = function (description, algorithmLookup)
{
	assert.array(description, 'description');
	assert.object(algorithmLookup, 'algorithmLookup');

	var self = this;
	var expression = [];

	function errExit(errStr) {
		var errMsg = 'Bad expression given: ' + errStr;
		self.log.error(errMsg);
		throw new Error(errMsg);
	}

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
