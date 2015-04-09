/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var sorter = require('../../lib/algorithms/sort-min-owner.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var givenServers = [ {
	unreserved_ram: 256,
	vms: {
		'ba155c91-1136-4632-a8bf-539d7152f534': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'e3d52038-64c3-42b0-99f1-b24ba57143eb': {
			owner_uuid: 'cfd6858c-9819-4599-bc11-35faf27ffc4c'
		},
		'addde32c-0a23-4b72-8d51-bb5de8abfcc1': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		}
	}
}, {
	unreserved_ram: 768,
	vms: {
		'a21c9ea6-778c-49f6-9ffb-d0fd4eda9880': {
			owner_uuid: '079eb14f-727d-457d-83b0-7e443b6bff7f'
		},
		'39170a58-f56a-48e6-af47-030706c21454': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'bdd34e37-1fcc-48a9-8cf6-c8a03e475470': {
			owner_uuid: '1feb3f67-cc23-405b-a8d3-e64888a0b676'
		}
	}
}, {
	unreserved_ram: 512,
	vms: {}
} ];

exports.sortMinOwner = function (t)
{
	var expectedServers = [
		givenServers[2],
		givenServers[1],
		givenServers[0]
	];

	var state = {};
	var constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		pkg: { alloc_server_spread: 'min-owner' }
	};

	var results = sorter.run(log, state, givenServers, constraints);
	var sortedServers = results[0];
	var reasons = results[1];

	t.deepEqual(sortedServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		pkg: {},
		defaults: { server_spread: 'min-owner' }
	};
	results = sorter.run(log, state, givenServers, constraints);
	t.deepEqual(results[0], expectedServers);


	t.done();
};

exports.sortMinOwner_without_pkg = function (t)
{
	var expectedServers = [
		givenServers[2],
		givenServers[1],
		givenServers[0]
	];

	var state = {};
	var constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		defaults: { server_spread: 'min-owner' }
	};

	var results = sorter.run(log, state, givenServers, constraints);
	var sortedServers = results[0];
	var reasons = results[1];

	t.deepEqual(sortedServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.sortMinOwner_skip_wrong_spread = function (t)
{
	var state = {};
	var constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		pkg: { alloc_server_spread: 'random' }
	};

	var results = sorter.run(log, state, givenServers, constraints);
	var sortedServers = results[0];
	var reasons = results[1];

	t.deepEqual(sortedServers, givenServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		pkg: {},
		defaults: { server_spread: 'random' }
	};
	results = sorter.run(log, state, givenServers, constraints);
	t.deepEqual(results[0], givenServers);

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (sorter.name) === 'string');
	t.done();
};
