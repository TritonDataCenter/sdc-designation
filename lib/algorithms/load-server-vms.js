/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * This plugin uses an external async function to load information about
 * all of a server's VMs into that server's object.
 *
 * Many plugins in dapi do not need information about VMs, or any information
 * derived from that VM data, so dapi runs such hard-filter plugins first.
 * This reduces the number of servers which need to have their VM information
 * loaded (an expensive operation). Then this plugin is run, which populates
 * the remaining servers with their VM data.
 *
 * This plugin does this by invoking in parallel the opts.getServerVms function,
 * a function provided to when dapi is initialized. opts.getServerVms takes a
 * server UUID, and returns an array of VMs in the callback, which this plugin
 * then inserts into a server object's 'vms' attribute.
 */

var assert = require('assert-plus');
var vasync = require('vasync');


function
loadServerVms(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.optionalFunc(opts.getServerVms, 'opts.getServerVms');
	assert.func(cb, 'cb');

	var getServerVms = opts.getServerVms;
	var log = opts.log;
	var reasons = {};
	var failed = {};

	if (!getServerVms) {
		log.debug('getServerVms not set; skipping VM loading');
		reasons.skip = 'getServerVms not set; assuming server.vms ' +
			'is already populated';
		return (cb(null, servers, reasons));
	}

	function loadVms(server, next) {
		getServerVms(server.uuid, function (err, vms) {
			if (err) {
				log.error('Error loading VMs for server ' +
					server.uuid + ': ' + err.message);

				reasons[server.uuid] = 'Error loading VMs: ' +
					err.message;

				failed[server.uuid] = true;
				return (next());
			}

			server.vms = {};
			vms.forEach(function (vm) {
				server.vms[vm.uuid] = vm;
			});

			reasons[server.uuid] = vms.length + ' VMs loaded';

			log.trace('Loaded VMs for server', server.uuid);

			return (next());
		});
	}

	log.debug('Loading VMs into server objects');
	return vasync.forEachParallel({
		inputs: servers,
		func: loadVms
	}, function () {
		log.info('VMs loaded into server objects');

		// only return servers that successfully loaded VM info
		var loadedServers = servers.filter(function (server) {
			return (!failed[server.uuid]);
		});

		cb(null, loadedServers, reasons);
	});
}

module.exports = {
	name: 'Load info about all VMs for each server',
	run: loadServerVms
};
