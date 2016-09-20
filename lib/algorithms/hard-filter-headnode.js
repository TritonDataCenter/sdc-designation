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
filterHeadnode(log, servers, constraints, cb)
{
	assert.object(log);
	assert.arrayOfObject(servers);
	assert.object(constraints);
	assert.func(cb);

	var reasons = {};

	var override = constraints.defaults.filter_headnode;
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
