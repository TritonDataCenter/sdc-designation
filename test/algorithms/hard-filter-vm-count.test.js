/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

var test = require('tape');
var genUuid = require('libuuid').create;
var filter = require('../../lib/algorithms/hard-filter-vm-count.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var testServers = [ {
	uuid: '33ce31d0-f376-4efd-ad41-f17c430b9782',
	vms: {
		'bb11d2de-a9c4-496a-9203-e9eb433fd906': {},
		'e7293dbc-34f2-4f76-b7ee-b715bb332540': {},
		'48d9715f-234c-4d79-ada4-47750e3c42cd': {}
	}
}, {
	uuid: 'b8ab34e9-2914-48c4-af75-5c6440240ce1',
	vms: {
		'72d9e6df-2858-4058-9163-1c02ce870d50': {},
		'1f0b0adf-194b-4bcf-960f-c2cf23c99171': {}
	}
}, {
	uuid: 'ff962080-5e04-463c-87b7-1f83d5b8c949',
	vms: {
		'61c16d92-48b3-4175-8391-388cf7673138': {},
		'a030d260-b15a-4270-871e-a1e7ed0f1e06': {},
		'b9bf5183-6855-4d14-9aab-587e5772a0c5': {},
		'f3b9d26d-20b6-4769-ab37-fbd6ebfdb34b': {}
	}
}, {
	uuid: '5cacecfe-614f-4bff-9d64-9504e1d40c33',
	vms: {}
} ];


test('filterVmCount()', function (t) {
	var expectedServers = [ testServers[1], testServers[3] ];
	var constraints = { defaults: { filter_vm_limit: 3 } };

	var results = filter.run(log, testServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);

	var expectedReasons = {
		'33ce31d0-f376-4efd-ad41-f17c430b9782':
			'Server has 3 VMs (limit is 3)',
		'ff962080-5e04-463c-87b7-1f83d5b8c949':
			'Server has 4 VMs (limit is 3)'
	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterVmCount() with no limit', function (t) {
	var server = {
		uuid: '0e07a7a2-92a2-4e59-915a-45ceae9cb75c',
		vms: {}
	};

	// should not filter out server with <224 VMs
	for (var i = 0; i !== 223; i++) {
		server.vms[genUuid()] = {};
	}

	var constraints = { defaults: {} };

	var results = filter.run(log, [server], constraints);
	var filteredServers = results[0];

	t.deepEqual(filteredServers, [server]);

	// should filter out server with >=224 VMs
	server.vms[genUuid()] = {};

	results = filter.run(log, [server], constraints);
	filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, []);

	t.deepEqual(reasons, {
		'0e07a7a2-92a2-4e59-915a-45ceae9cb75c':
			'Server has 224 VMs (limit is 224)'
	});

	t.end();
});


test('filterVmCount() with no servers', function (t) {
	var servers = [];
	var constraints = { defaults: { filter_vm_limit: 3 } };

	var results = filter.run(log, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(reasons, {});

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
