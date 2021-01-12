/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2021 Joyent, Inc.
 */

/*
 * This filter will:
 *
 * - ensures linux "lxd" instances are only provisioned to servers that
 *   have sysinfo['System Type'] == 'linux'.
 * - ensures all other (SmartOS) instances are only provisioned to SmartOS
 *   servers.
 */

var assert = require('assert-plus');

function filterOS(servers, opts, cb) {
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.string(opts.vm.brand, 'opts.vm.brand');
	assert.optionalNumber(opts.vm.vcpus, 'opts.vm.vcpus');
	assert.func(cb, 'cb');

	var reasons = {};
	var imgType = opts.img && opts.img.type;
	var requireLinux = opts.vm.brand === 'lx' && imgType === 'lxd';

	var adequateServers = servers.filter(function checkServerOS(server) {
		var serverOS = server.sysinfo && server.sysinfo['System Type'];

		if (requireLinux && serverOS !== 'linux') {
			reasons[server.uuid] =
				'Server does not have "linux" OS';
			return (false);
		}

		if (!requireLinux && serverOS === 'linux') {
			reasons[server.uuid] =
				'Server does not have "SunOS" OS';
			return (false);
		}

		return (true);
	});

	return (cb(null, adequateServers, reasons));
}

module.exports = {
	name: 'Servers which have the required OS',
	run: filterOS
};
