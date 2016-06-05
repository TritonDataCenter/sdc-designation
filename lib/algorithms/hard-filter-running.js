/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Returns servers with a "running" status.
 *
 * Due to the way that data is populated by CNAPI et al, we should run
 * this step before validation, otherwise there will be misleading reasons
 * given by DAPI why a server is filtered out. However, as a result, this
 * plugin cannot make any assumptions about the presence and format of data.
 */

function
filterRunning(log, servers, constraints)
{
	var reasons = {};
	var adequateServers;

	if (!Array.isArray(servers))
		return ([servers]);

	adequateServers = servers.filter(function (server) {
		if (!server || typeof (server) !== 'object')
			return (false);

		if (server.status === 'running')
			return (true);

		if (server.status === 'unknown')
			log.warn('Server has unknown status:', server.uuid);

		reasons[server.uuid] = 'Server has status: ' + server.status;

		return (false);
	});

	return ([adequateServers, reasons]);
}

module.exports = {
	name: 'Servers which are currently running',
	run: filterRunning
};
