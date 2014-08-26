/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/hard-filter-headnode.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.filterHeadnode = function (t)
{
	var givenServers = [
		{ memory_available_bytes: 256 },
		{ memory_available_bytes: 512, headnode: true },
		{ memory_available_bytes: 768, headnode: false }
	];

	var expectedServers = [ givenServers[0], givenServers[2] ];
	var state = {};

	var results = filter.run(log, state, givenServers, {});
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.filterHeadnode_with_no_servers = function (t)
{
	var state = {};

	var results = filter.run(log, state, []);
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
