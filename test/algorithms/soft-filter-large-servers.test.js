/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/soft-filter-large-servers.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var givenServers = [];
for (var ii = 0; ii < 20; ii++)
	givenServers.push({ unreserved_ram: ii * 8 * 1024 });


test('filterLargeServers() with small allocation', function (t) {
	var expectedServers =
	    givenServers.slice(0, givenServers.length - 3).reverse();
	var state = {};
	var constraints = { vm: { ram: 30 * 1024 } };  /* for vm, in MiB */

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterLargeServers() with large allocation', function (t) {
	var expectedServers = givenServers.slice(givenServers.length - 3,
	    givenServers.length).reverse();
	var state = {};
	var constraints = { vm: { ram: 34 * 1024 } };  /* for vm, in MiB */

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterLargeServers() with few servers', function (t) {
	var servers = givenServers.slice(0, 3).reverse();
	var state = {};
	var constraints = { vm: { ram: 34 * 1024 } };	/* for vm, in MiB */

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, servers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterLargeServers() with no servers', function (t) {
	var state = {};
	var servers = [];
	var constraints = { vm: { ram: 34 * 1024 } };  /* for vm, in MiB */

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, []);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
