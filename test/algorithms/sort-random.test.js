/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var sorter = require('../../lib/algorithms/sort-random.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('sortRandom()', function (t) {
	var servers = [
		{ unreserved_ram: 256 },
		{ unreserved_ram: 768 },
		{ unreserved_ram: 512 }
	];

	var state = {};
	var constraints = { pkg: { alloc_server_spread: 'random' } };

	for (var i = 0; i !== 100; i++) {
		var results = sorter.run(log, state, servers, constraints);
		var sorted = results[0];
		var reasons = results[1];

		t.deepEqual(state, {});
		t.deepEqual(reasons, undefined);

		if (sorted[0].unreserved_ram !== servers[0].unreserved_ram ||
		    sorted[1].unreserved_ram !== servers[0].unreserved_ram ||
		    sorted[2].unreserved_ram !== servers[2].unreserved_ram) {
			return (t.end());
		}
	}

	t.ok(false);

	constraints = { pkg: {}, defaults: { server_spread: 'random' } };

	for (i = 0; i !== 100; i++) {
		results = sorter.run(log, state, servers, constraints);
		sorted = results[1];

		if (sorted[0].unreserved_ram !== servers[0].unreserved_ram ||
		    sorted[1].unreserved_ram !== servers[0].unreserved_ram ||
		    sorted[2].unreserved_ram !== servers[2].unreserved_ram) {
			return (t.end());
		}
	}

	t.ok(false);
	t.end();
});


test('sortRandom() without pkg', function (t) {
	var servers = [
		{ unreserved_ram: 256 },
		{ unreserved_ram: 768 },
		{ unreserved_ram: 512 }
	];

	var state = {};
	var constraints = { defaults: { server_spread: 'random' } };

	for (var i = 0; i !== 100; i++) {
		var results = sorter.run(log, state, servers, constraints);
		var sorted = results[0];
		var reasons = results[1];

		t.deepEqual(state, {});
		t.deepEqual(reasons, undefined);

		if (sorted[0].unreserved_ram !== servers[0].unreserved_ram ||
		    sorted[1].unreserved_ram !== servers[0].unreserved_ram ||
		    sorted[2].unreserved_ram !== servers[2].unreserved_ram) {
			return (t.end());
		}
	}

	t.ok(false);
	t.end();
});


test('sortRandom() skip wrong spread', function (t) {
	var servers = [
		{ unreserved_ram: 256 },
		{ unreserved_ram: 768 },
		{ unreserved_ram: 512 }
	];

	var state = {};
	var constraints = { pkg: { alloc_server_spread: 'min-owner' } };

	var results = sorter.run(log, state, servers, constraints);
	var sortedServers = results[0];
	var reasons = results[1];

	t.deepEqual(sortedServers, servers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	constraints = { pkg: {}, defaults: { server_spread: 'min-owner' } };
	results = sorter.run(log, state, servers, constraints);
	t.deepEqual(results[0], servers);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (sorter.name), 'string');
	t.end();
});
