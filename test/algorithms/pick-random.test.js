/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var picker = require('../../lib/algorithms/pick-random.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('pickRandom()', function (t) {
	var givenServers = [
		{ memory_available_bytes: 256 },
		{ memory_available_bytes: 768 },
		{ memory_available_bytes: 512 }
	];

	var constraints = {};
	var pickedServers = [];

	for (var i = 0; i != 60; i++) {
		var state = {};

		var results = picker.run(log, state, givenServers, constraints);
		var server = results[0][0];
		var reasons = results[1];

		var ram = server.memory_available_bytes;
		pickedServers[ram] = true;
		t.ok(ram === 256 || ram === 512 || ram === 768);
		t.deepEqual(state, {});
		t.deepEqual(reasons, undefined);

	}

	t.ok(pickedServers[256] && pickedServers[512] && pickedServers[768]);

	t.end();
});


test('pickRandom() with no servers', function (t) {
	var servers = [];
	var constraints = {};

	for (var i = 0; i != 5; i++) {
		var state = {};

		var results = picker.run(log, state, servers, constraints);
		var pickedServers = results[0];
		var reasons = results[1];

		t.deepEqual(pickedServers, []);
		t.deepEqual(state, {});
		t.deepEqual(reasons, undefined);
	}

	t.end();
});


test('name', function (t) {
	t.equal(typeof (picker.name), 'string');
	t.end();
});
