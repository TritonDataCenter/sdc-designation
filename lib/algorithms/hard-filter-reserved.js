/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns servers which are not reserved.
 */

var assert = require('assert-plus');

function
filterReserved(log, servers, constraints, cb)
{
	assert.object(log);
	assert.arrayOfObject(servers);
	assert.object(constraints);
	assert.func(cb);

	var adequateServers = servers.filter(function (server) {
		return (!server.reserved);
	});

	return (cb(null, adequateServers, {}));
}

module.exports = {
	name: 'Servers which are not reserved',
	run: filterReserved
};
