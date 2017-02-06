/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/*
 * Returns servers which have more that a minumum amount of free disk.
 */

var assert = require('assert-plus');
var constants = require('./shared/constants');

var MiB = 1024 * 1024;
var POOL_USABLE_RATIO = constants.POOL_USABLE_RATIO;

function
filterMinFreeDisk(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.defaults, 'opts.defaults');
	assert.func(cb, 'cb');

	var reasons = {};
	var requiredFreeDisk = opts.defaults.minimum_free_disk; // in MiB

	if (requiredFreeDisk === undefined) {
		reasons.skip = 'No minimum free disk set';
		return (cb(null, servers, reasons));
	}

	function filter(server) {
		var freeDisk = (server.disk_pool_size_bytes *
			POOL_USABLE_RATIO - server.disk_pool_alloc_bytes) / MiB;
		freeDisk = Math.max(0, Math.ceil(freeDisk));

		if (freeDisk >= +requiredFreeDisk)
			return (true);

		reasons[server.uuid] = 'Server requires ' + requiredFreeDisk +
			'MB free disk, but only has ' + freeDisk + 'MB';

		return (false);
	}

	return (cb(null, servers.filter(filter), reasons));
}

module.exports = {
	name: 'Servers with enough free disk',
	run: filterMinFreeDisk
};
