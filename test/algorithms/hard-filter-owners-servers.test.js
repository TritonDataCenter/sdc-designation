/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-owners-servers.js');
var common = require('./common.js');


var SERVERS = [ {
	uuid: '33ce31d0-f376-4efd-ad41-f17c430b9782',
	unreserved_ram: 1024
}, {
	uuid: 'b8ab34e9-2914-48c4-af75-5c6440240ce1',
	unreserved_ram: 768
}, {
	uuid: 'ff962080-5e04-463c-87b7-1f83d5b8c949',
	unreserved_ram: 2048
} ];


var checkFilter = common.createPluginChecker(filter);


test('filterServersByOwners() with owner', function (t) {
	var expectServers = [SERVERS[1]];
	var expectReasons = {
			/* JSSTYLED */
			'*': 'Servers pass filter for owner 2316e149-1562-47ff-abea-00bda80d0e7f: server.uuid === "b8ab34e9-2914-48c4-af75-5c6440240ce1"'
	};

	var opts = {
		defaults: {
			filter_owner_server: {
				/* BEGIN JSSTYLED */
				'2316e149-1562-47ff-abea-00bda80d0e7f': 'server.uuid === "b8ab34e9-2914-48c4-af75-5c6440240ce1"',
				'10a4ca4c-26e9-11e6-a0db-28cfe91f7d53': 'server.unreserved_ram > 1024'
				/* END JSSTYLED */
			}
		},
		vm: { owner_uuid: '2316e149-1562-47ff-abea-00bda80d0e7f' }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterServersByOwners() without owner', function (t) {
	var expectServers = [SERVERS[0]];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'b8ab34e9-2914-48c4-af75-5c6440240ce1': 'Removed by filter for owner 2316e149-1562-47ff-abea-00bda80d0e7f',
		'ff962080-5e04-463c-87b7-1f83d5b8c949': 'Removed by filter for owner 10a4ca4c-26e9-11e6-a0db-28cfe91f7d53'
		/* END JSSTYLED */
	};

	var opts = {
		defaults: {
			filter_owner_server: {
				/* BEGIN JSSTYLED */
				'2316e149-1562-47ff-abea-00bda80d0e7f': 'server.uuid === "b8ab34e9-2914-48c4-af75-5c6440240ce1"',
				'10a4ca4c-26e9-11e6-a0db-28cfe91f7d53': 'server.unreserved_ram > 1024'
				/* END JSSTYLED */
			}
		},
		vm: { owner_uuid: '9094b92e-26e9-11e6-b476-28cfe91f7d53' }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterServersByOwners() with owner and bad code', function (t) {
	var expectServers = [];
	var expectReasons = {
		'*': 'Error running filter for owner ' +
			'2316e149-1562-47ff-abea-00bda80d0e7f: sdasd ++'
	};

	var opts = {
		defaults: {
			filter_owner_server: {
				'2316e149-1562-47ff-abea-00bda80d0e7f':
					'sdasd ++',
				'10a4ca4c-26e9-11e6-a0db-28cfe91f7d53':
					'server.unreserved_ram > 1024'
			}
		},
		vm: { owner_uuid: '2316e149-1562-47ff-abea-00bda80d0e7f' }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterServersByOwners() without owner and bad code', function (t) {
	var expectServers = [];
	var expectReasons = {
		'*': 'Error running filter for owner ' +
			'2316e149-1562-47ff-abea-00bda80d0e7f: sdasd ++'
	};

	var opts = {
		defaults: {
			filter_owner_server: {
				'2316e149-1562-47ff-abea-00bda80d0e7f':
					'sdasd ++',
				'10a4ca4c-26e9-11e6-a0db-28cfe91f7d53':
					'server.unreserved_ram > 1024'
			}
		},
		vm: { owner_uuid: 'cce25c36-26eb-11e6-a8f3-28cfe91f7d53' }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterServersByOwners() with no default', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'No filter_owner_server default to run'
	};

	var opts = {
		defaults: {},
		vm: { owner_uuid: 'cce25c36-26eb-11e6-a8f3-28cfe91f7d53' }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterServersByOwners() with no servers', function (t) {
	var expectServers = [];
	var expectReasons =  {
		'*': 'Servers pass filter for owner ' +
			'6d6d49a9-f190-41d9-8077-d6b67b55a55b: server.ram > 128'
	};

	var opts = {
		defaults: {
			filter_owner_server: {
				'6d6d49a9-f190-41d9-8077-d6b67b55a55b':
					'server.ram > 128'
			}
		},
		vm: {
			owner_uuid: '6d6d49a9-f190-41d9-8077-d6b67b55a55b'
		}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
