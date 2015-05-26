/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var uuid = require('node-uuid');
var filter = require('../../lib/algorithms/soft-filter-recent-servers.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var givenServers = [];
for (var ii = 0; ii < 12; ii++) {
	givenServers.push({ uuid: uuid() });
}


test('filterRecentServers() with no prior servers', function (t) {
	var expectedServers = givenServers;
	var state = {};
	var constraints = {};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, { recent_servers: {} });
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterRecentServers() with some prior servers', function (t) {
	var now = +new Date();
	var expectedServers  = givenServers.slice(0, 11);
	var oldServerUuid	= givenServers[11].uuid;
	var tooOldServerUuid = givenServers[10].uuid;

	var state = { recent_servers: {} };
	state.recent_servers[oldServerUuid   ] = now - 4 * 60 * 1000;
	state.recent_servers[tooOldServerUuid] = now - 6 * 60 * 6000;

	var constraints = {};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(Object.keys(state), ['recent_servers']);
	t.deepEqual(Object.keys(state.recent_servers), [oldServerUuid]);
	t.equal(state.recent_servers[oldServerUuid], now - 4 * 60 * 1000);
	t.deepEqual(reasons, undefined);

	t.end();
});


test('filterRecentServers() with more prior servers', function (t) {
	var now = +new Date();
	var expectedServers = givenServers.slice(3, givenServers.length);

	var state = { recent_servers: {} };
	for (var i = 0; i !== givenServers.length - 1; i++) {
		var serverUuid = givenServers[i].uuid;
		var timestamp  = now - (i + 0.5) * 60 * 1000;
		state.recent_servers[serverUuid] = timestamp;
	}

	var constraints = {};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(Object.keys(state), ['recent_servers']);
	t.deepEqual(reasons, undefined);

	t.equal(Object.keys(state.recent_servers).length, 5);
	for (i = 0; i < 5; i++) {
		serverUuid = givenServers[i].uuid;
		timestamp  = now - (i + 0.5) * 60 * 1000;
		t.deepEqual(state.recent_servers[serverUuid], timestamp);
	}

	t.end();
});


test('filterRecentServers() with no prior servers', function (t) {
	var state = {};
	var servers = [];
	var constraints = {};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, { recent_servers: {} });
	t.deepEqual(reasons, undefined);

	t.end();
});


test('post', function (t) {
	var server = givenServers[0];
	var state  = { recent_servers: {} };
	var now	= +new Date();

	filter.post(log, state, server);

	t.equal(Object.keys(state.recent_servers).length, 1);
	t.ok(state.recent_servers[server.uuid] >= now);

	t.end();
});


/* this can happen when allocations fails */
test('post without server', function (t) {
	var state  = { recent_servers: {} };

	filter.post(log, state, null);

	t.deepEqual(state, { recent_servers: {} });
	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
