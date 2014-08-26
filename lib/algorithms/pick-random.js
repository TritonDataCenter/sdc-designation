/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns a random server.
 */

function
pickRandomServer(log, state, servers)
{
	var index;

	if (servers.length === 0)
		return ([[]]);

	index = Math.floor(Math.random() * servers.length);

	return ([[servers[index]]]);
}

module.exports = {
	name: 'Random server',
	run: pickRandomServer,
	affectsCapacity: false
};
