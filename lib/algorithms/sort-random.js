/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Sorts servers randomly.
 */

function
sortRandom(log, state, servers, constraints)
{
	if ((constraints.pkg && constraints.pkg.alloc_server_spread ||
	    constraints.defaults.server_spread) !== 'random')
		return ([servers]);

	/* shallow copy to avoid mutating order of referred array */
	servers = servers.slice(0);

	/* Durstenfeld shuffle */
	for (var i = servers.length - 1; i !== 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = servers[i];
		servers[i] = servers[j];
		servers[j] = tmp;
	}

	return ([servers]);
}

module.exports = {
	name: 'Sort servers randomly',
	run: sortRandom,
	affectsCapacity: false
};
