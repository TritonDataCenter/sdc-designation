/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-reservoir.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.filterReservoir = function (t)
{
	var givenServers = [
		{ memory_available_bytes: 128, reservoir: false },
		{ memory_available_bytes: 384 },
		{ memory_available_bytes: 768, reservoir: true }
	];

	var expectedServers = givenServers.slice(0, 2);
	var state = {};
	var constraints = {};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.filterReservoir_with_no_servers = function (t)
{
	var state = {};
	var servers = [];
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
