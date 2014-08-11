/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
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
