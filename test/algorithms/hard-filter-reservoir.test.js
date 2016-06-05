/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-reservoir.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('filterReservoir()', function (t) {
	var givenServers = [
		{ memory_available_bytes: 128, reservoir: false },
		{ memory_available_bytes: 384 },
		{ memory_available_bytes: 768, reservoir: true }
	];

	var expectedServers = givenServers.slice(0, 2);
	var constraints = {};

	var results = filter.run(log, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterReservoir() with no servers', function (t) {
	var servers = [];
	var constraints = {};

	var results = filter.run(log, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(reasons, undefined);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
