/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var mod_fs = require('fs');
var filter = require('../../lib/algorithms/hard-filter-invalid-servers.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); },
	warn:  function () { return (true); }
};


test('filterInvalidServers()', function (t) {
	var serversInfo = JSON.parse(mod_fs.readFileSync(__dirname +
	    '/hf-invalid-servers.json'));

	var constraints = {};

	var results = filter.run(log, serversInfo, constraints);
	var servers = results[0];
	var reasons = results[1];
	t.equal(servers.length, 1);
	t.deepEqual(servers[0].uuid, '2bb4c1de-16b5-11e4-8e8e-07469af29312');

	var expectedReasons = {
		/* BEGIN JSSTYLED */
		'dd5dac66-b4be-4b75-859b-b375bc577e90': 'property "vms.b3d04682-536f-4f09-8170-1954e45e9e1c.owner_uuid": is missing and it is required',
		'390d2a35-8b54-449a-a82d-6c0c623afc8c': 'property "memory_total_bytes": is missing and it is required',
		'd0c1bacd-77b2-409a-a629-9ada5cc0eef9': 'property "reserved": string value found, but a boolean is required',
		'a8da02c2-a294-4f66-bb7d-8a5c6689588d': 'property "sysinfo.Network Interfaces.e1000g0.NIC Names[1]": number value found, but a string is required',
		'6a6ffadd-e274-4089-a561-ccbdc894ae76': 'property "sysinfo.Live Image": is missing and it is required',
		'bc19a132-a1d7-408d-a8b3-73453c7d4f0b': 'property "vms.d95e64c8-da45-4b81-a044-89e26db43cbc.state": is missing and it is required',
		'e4c4b6ee-3cfa-11e6-9214-28cfe91f7d53': 'property "disk_pool_alloc_bytes": is missing and it is required'
		/* END JSSTYLED */

	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterInvalidServers() with no servers', function (t) {
	var serversInfo = [];
	var constraints = {};

	var results = filter.run(log, serversInfo, constraints);
	var servers = results[0];
	var reasons = results[1];

	t.deepEqual(servers, []);
	t.deepEqual(reasons, {});

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
