/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2019, Joyent, Inc.
 */

/*
 * TRITON-1242: Returns servers which are not virtual (mockcloud) servers.
 *
 * This filter is only needed in test enviroments where virtual testing CNs
 * are being used.
 *
 * This filter is enabled when any one of the following conditions are met:
 *  - vm is a docker container
 *  - the vm has the 'triton.placement.exclude_virtual_servers' tag set to true
 */

var assert = require('assert-plus');

var EXCLUDE_VIRTUAL_SERVERS_TAG = 'triton.placement.exclude_virtual_servers';

function
filterVirtualServers(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.object(opts.log, 'opts.log');
	assert.func(cb, 'cb');

	var log = opts.log;
	var vm = opts.vm;

	// Check if we need to exclude virtual servers. Currently we exclude
	// virtual servers for *all* docker provisions and for provisions that
	// have asked nicely (have the exclude virtual tag set).
	var excludeVirtualServers = vm.docker || (vm.tags &&
		vm.tags[EXCLUDE_VIRTUAL_SERVERS_TAG]);

	var reasons = {};
	var adequateServers;

	if (!excludeVirtualServers) {
		cb(null, servers, reasons);
		return;
	}

	log.trace('Filtering virtual servers');

	adequateServers = servers.filter(function _filterVC(server) {
		if (server.sysinfo &&
				server.sysinfo['System Type'] === 'Virtual') {
			reasons[server.uuid] =
				'Server is a virtual server - excluding';
			return (false);
		}
		return (true);
	});

	cb(null, adequateServers, reasons);
}

module.exports = {
	name: 'Servers which are not virtual servers',
	run: filterVirtualServers
};
