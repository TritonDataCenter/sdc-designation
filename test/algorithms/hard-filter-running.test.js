/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-running.js');
var common = require('./common.js');


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var checkFilter = common.createPluginChecker(filter, LOG);


test('filterRunning()', function (t) {
	var servers = [ {
		uuid: '2c86607e-7cdd-4d6b-a7db-16d91efe770c'
	}, {
		uuid: '7ddf3e13-5386-41bd-96b9-a85825013d44',
		status: 'running'
	}, {
		uuid: '242ef61f-2b26-42f1-a626-8ccf32738128',
		status: 'running'
	}, {
		uuid: 'ac211712-34e6-45ac-b9e9-9165f6af3cfc',
		status: 'offline'
	} ];

	var expectServers = servers.slice(1, 3);
	var expectReasons = {
		'2c86607e-7cdd-4d6b-a7db-16d91efe770c':
		    'Server has status: undefined',
		'ac211712-34e6-45ac-b9e9-9165f6af3cfc':
		    'Server has status: offline'
	};

	var constraints = {};

	checkFilter(t, servers, constraints, expectServers, expectReasons);
});


test('filterRunning() with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};

	var constraints = {};

	checkFilter(t, [], constraints, expectServers, expectReasons);
});


test('filterRunning() with malformed servers', function (t) {
	var givenServers = [
		{ uuid: '2c86607e-7cdd-4d6b-a7db-16d91efe770c',
		    status: 'running' },
		{ uuid: '242ef61f-2b26-42f1-a626-8ccf32738128',
		    status: 'rebooting' }
	];

	var expectServers = [ givenServers[0] ];
	var expectReasons = {
		'242ef61f-2b26-42f1-a626-8ccf32738128':
		    'Server has status: rebooting'
	};

	var constraints = {};

	filter.run(LOG, givenServers, constraints,
			function (err, servers, reasons) {
		t.ifError(err);

		t.deepEqual(servers, expectServers);
		t.deepEqual(reasons, expectReasons);

		t.end();
	});
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
