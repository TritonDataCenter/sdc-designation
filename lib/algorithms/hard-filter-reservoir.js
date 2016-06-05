/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns servers which are not in the reservoir.
 */

function
filterReservoir(log, servers)
{
	var adequateServers = servers.filter(function (server) {
		return (!server.reservoir);
	});

	return ([adequateServers]);
}

module.exports = {
	name: 'Servers which are not in the reservoir',
	run: filterReservoir
};
