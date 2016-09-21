/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers which have fewer than a fixed limit of VMs.
 *
 * By default, this plugin filters out servers with equal or more than
 * DEFAULT_VM_LIMIT VMs on it. However, if "filter_vm_limit" is set in the
 * defaults, servers which have equal or more than than attribute's number of
 * VMs will be removed.
 */

var assert = require('assert-plus');

/* Default maximum number of VMs that can occupy a single server */
var DEFAULT_VM_LIMIT = 224;

function
filterVmCount(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.defaults, 'opts.defaults');
	assert.object(opts.log, 'opts.log');
	assert.func(cb, 'cb');

	var log = opts.log;
	var vmLimit = +opts.defaults.filter_vm_limit || DEFAULT_VM_LIMIT;
	var reasons = {};

	log.trace('Filtering servers with more than', vmLimit, 'VMs');

	var adequateServers = servers.filter(function (server) {
		var numVms = Object.keys(server.vms).length;

		if (numVms >= vmLimit) {
			var msg = 'Server has ' + numVms + ' VMs (limit is ' +
				vmLimit + ')';
			log.trace('Skipping server', server.uuid, 'because',
				msg);

			reasons[server.uuid] = msg;

			return (false);
		}

		return (true);
	});

	return (cb(null, adequateServers, reasons));
}

module.exports = {
	name: 'Servers with more VMs than limit',
	run: filterVmCount
};
