/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-setup.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('filterSetup()', function (t) {
	var givenServers = [
		{ memory_available_bytes: 128 },
		{ memory_available_bytes: 256, setup: true },
		{ memory_available_bytes: 512, setup: false },
		{ memory_available_bytes: 768, setup: true }
	];

	var expectedServers = [ givenServers[1], givenServers[3] ];
	var state = {};
	var constraints = {};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterSetup() with no servers', function (t) {
	var state = {};
	var servers = [];
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterSetup() with malformed servers 1', function (t) {
	var state = {};
	var servers = 'foo';
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers, 'foo');
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterSetup() with malformed servers 2', function (t) {
	var state = {};
	var servers = [ 'foo', { setup: true }, { setup: false } ];
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, [ { setup: true } ]);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
