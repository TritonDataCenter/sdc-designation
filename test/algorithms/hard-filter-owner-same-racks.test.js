/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var mod_fs = require('fs');
var filter = require('../../lib/algorithms/hard-filter-owner-same-racks.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('filterSameRacks()', function (t) {
	var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
	var givenServers = JSON.parse(mod_fs.readFileSync(__dirname +
	    '/hf-owner-same-racks.json'));

	var expectedServers = givenServers.slice(3, 6);
	var state = {};
	var constraints = { vm: { owner_uuid: owner_uuid } };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'e28724d2-cef0-4bcb-b549-33b479464bb9':
			'VM\'s owner has another VM in rack foo',
		'7f6b2cee-34a0-41fa-a2b2-bb6bdfea3031':
			'VM\'s owner has another VM in rack foo',
		'b1c3c15b-b42e-408c-a55d-7ef0cc20a74b':
			'VM\'s owner has another VM in rack foo',
		'39668421-e19a-417c-87d3-e906d85dc612':
			'VM\'s owner has another VM in rack baz',
		'81439554-d5f6-42f8-8f95-9db1c9b51239':
			'VM\'s owner has another VM in rack baz',
		'017ee385-529c-450d-b059-fb72f9433b9d':
			'VM\'s owner has another VM in rack baz'
	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterSameRacks() with no VMs', function (t) {
	var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
	var state = {};
	var givenServers = [
		{
			uuid: '626f74d3-c163-4b5d-96e4-e89e8d63e3b5',
			rack_identifier: 'bar'
		}
	];
	var constraints = { vm: { owner_uuid: owner_uuid } };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 1);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.end();
});


test('filterSameRacks() with no servers', function (t) {
	var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
	var state = {};
	var servers = [];
	var constraints = { vm: { owner_uuid: owner_uuid } };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
