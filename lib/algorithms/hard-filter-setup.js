/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns servers which have been setup.
 *
 * Due to the way that data is populated by CNAPI et al, we should run
 * this step before validation, otherwise there will be misleading reasons
 * given by DAPI why a server is filtered out. However, as a result, this
 * plugin cannot make any assumptions about the presence and format of data.
 */

var assert = require('assert-plus');

function
filterSetup(log, servers, constraints, cb)
{
	assert.object(log);
	assert.arrayOfObject(servers);
	assert.object(constraints);
	assert.func(cb);

	var reasons = {};

	var adequateServers = servers.filter(function (server) {
		return (server.setup);
	});

	return (cb(null, adequateServers, reasons));
}

module.exports = {
	name: 'Servers which have been setup',
	run: filterSetup
};
