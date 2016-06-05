/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * Filters out servers which an owner should (and should not) have access to.
 *
 * This is a more experimental plugin, which allows operators to set small
 * snippets of Javascript code which are applied to every server object. These
 * snippets should return booleans.
 *
 * If an owner provisions a VM, and there is a snippet set for that owner,
 * servers are filtered thorough that snippet. A returned 'true' will keep
 * that server for later plugins. 'false' will remove it.
 *
 * If an owner provisions a VM, and there isn't a snippet set for that owner,
 * only servers which none of the  snippet apply to will be kept for the next
 * plugin.
 */

function
filterServersByOwners(log, servers, constraints)
{
	var ownerUuid = constraints.vm.owner_uuid;
	var filters = constraints.defaults.filter_owner_server;
	var reasons = {};

	if (!filters) {
		reasons.skip = 'No filter_owner_server default to run';
		return ([servers, reasons]);
	}

	if (filters[ownerUuid]) {
		servers = filterOwner(log, servers, filters, ownerUuid,
			reasons);
	} else {
		servers = filterNotOwners(log, servers, filters, reasons);
	}

	return ([servers, reasons]);
}



/*
 * Return servers which the owner's snippet returns true for.
 */
function
filterOwner(log, servers, filters, ownerUuid, reasons)
{
	var code = filters[ownerUuid];
	var acceptedServers;
	var msg;

	try {
		acceptedServers = filterWithCode(servers, code);
		msg = 'Servers pass filter for owner ' + ownerUuid + ': ' +
			code;
	} catch (e) {
		acceptedServers = [];
		msg = 'Error running filter for owner ' + ownerUuid + ': ' +
			code;
		log.error(msg, e);
	}

	reasons['*'] = msg;
	return (acceptedServers);
}


/*
 * Return servers which none of the snippets return true for.
 */
function
filterNotOwners(log, servers, filters, reasons)
{
	var ownerServers = {};
	var ownerUuids = Object.keys(filters);

	for (var i = 0; i !== ownerUuids.length; i++) {
		var ownerUuid = ownerUuids[i];
		var code = filters[ownerUuid];

		try {
			var filteredServers = filterWithCode(servers, code);
		} catch (e) {
			var msg = 'Error running filter for owner ' +
				ownerUuid + ': ' + code;
			log.error(msg, e);
			reasons['*'] = msg;
			return ([]);
		}

		filteredServers.forEach(function (server) {
			ownerServers[server.uuid] = ownerUuid;
		});
	}

	var notOwnerServers = servers.filter(function (server) {
		var uuid = ownerServers[server.uuid];

		if (uuid) {
			reasons[server.uuid] = 'Removed by filter for owner ' +
				uuid;
			return (false);
		}

		return (true);
	});

	return (notOwnerServers);
}


/*
 * Create a poor-man's "safe" environment and execute a Javascript snippet.
 * This comes with the usual disclaimer: this isn't made to handle hostile code;
 * it's here to help prevent trusted code from doing anything too nuts by
 * masking out global imports and values.
 */
function
filterWithCode(servers, code)
{
	var context = ['server'];
	for (var attr in this)
		context.push(attr);

	var filter = new Function(context, 'return ' + code);
	var filteredServers = servers.filter(filter);

	return (filteredServers);
}


module.exports = {
	name: 'Filter CNs based on owner filters',
	run: filterServersByOwners
};
