/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

/*
 * Code shared by the locality plugins. For more details, see the big-theory
 * statement at the top of soft-filter-locality-hints.js.
 */

var assert = require('assert-plus');


/*
 * Normalize the `locality.near` and `locality.far` properties.
 *
 * On the way in, then can be: undefined, a UUID string, an array of UUIDs
 * On the way out: an array with 0 or more UUIDs.
 */
function normNearFar(nearFar, errStr) {
	if (typeof (nearFar) === 'string') {
		nearFar = [nearFar];
	} else if (!nearFar) {
		nearFar = [];
	}
	assert.arrayOfUuid(nearFar, errStr);
	return (nearFar);
}


/*
 * Process `far`: filter out any server that has any of the VMs
 * listed in `far`.
 *
 * `reasons` is modified in place.
 */
function filterFar(servers, reasons, far, strict, ownerUuid) {
	var filteredServers = [];
	for (var i = 0; i < servers.length; i++) {
		var server = servers[i];
		var serverVms = server.vms;
		var exclude = false;
		for (var j = 0; j < far.length; j++) {
			var vm = serverVms[far[j]];
			if (vm &&
			    /* owner_uuid guard (see top comment) */
			    vm.owner_uuid === ownerUuid)
			{
				reasons[server.uuid] = 'exclude: inst!='
					+ far[j];
				exclude = true;
				break;
			}
		}
		if (!exclude) {
			filteredServers.push(server);
		}
	}
	if (!strict && filteredServers.length === 0) {
		// Non-strict filter: Ignore these far filters.
		Object.keys(reasons).forEach(function (uuid) {
			reasons[uuid] += ' (ignored b/c non-strict)';
		});
	} else {
		servers = filteredServers;
	}

	return (servers);
}


module.exports = {
	normNearFar: normNearFar,
	filterFar: filterFar
};
