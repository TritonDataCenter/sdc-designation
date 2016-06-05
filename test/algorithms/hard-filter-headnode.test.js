/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-headnode.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('filterHeadnode()', function (t) {
	var givenServers = [
		{ memory_available_bytes: 256 },
		{ memory_available_bytes: 512, headnode: true },
		{ memory_available_bytes: 768, headnode: false }
	];

	var expectedServers = [ givenServers[0], givenServers[2] ];
	var constraints = { defaults: {} };

	var results = filter.run(log, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(reasons, undefined);

	constraints = { defaults: { filter_headnode: false } };
	results = filter.run(log, givenServers, constraints);
	t.deepEqual(results[0], givenServers);

	t.end();
});


test('filterHeadnode() with no servers', function (t) {
	var constraints = { defaults: {} };

	var results = filter.run(log, [], constraints);
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
