/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-setup.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.filterSetup = function (t)
{
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

	t.done();
};

exports.filterSetup_with_no_servers = function (t)
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

exports.filterSetup_with_malformed_servers_1 = function (t)
{
	var state = {};
	var servers = 'foo';
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers, 'foo');
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.filterSetup_with_malformed_servers_2 = function (t)
{
	var state = {};
	var servers = [ 'foo', { setup: true }, { setup: false } ];
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, [ { setup: true } ]);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
