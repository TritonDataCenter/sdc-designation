/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Filters out headnodes from server selection.
 */

var assert = require('assert-plus');

function
filterHeadnode(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.func(cb, 'cb');

	var reasons = {};

	var override = opts.defaults.filter_headnode;
	if (typeof (override) !== 'undefined' && !override) {
		reasons.skip = 'Do not filter out headnodes';
		return (cb(null, servers, reasons));
	}

	var adequateServers = servers.filter(function (server) {
		return (!server.headnode);
	});

	return (cb(null, adequateServers, reasons));
}

module.exports = {
	name: 'Servers which are not headnodes',
	run: filterHeadnode
};
