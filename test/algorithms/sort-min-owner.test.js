/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

var test = require('tape');
var sorter = require('../../lib/algorithms/sort-min-owner.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var givenServers = [ {
	uuid: 'b38dc3a0-eb00-11e5-943f-8bc57e287d0d',
	unreserved_ram: 256,
	/*
	 * Give the test owner (e666*) at least double-digit VMs here, because
	 * we want to test the surprise bug (DAPI-???) where `counts.sort()`
	 * did *string* comparison such that `4 > 10`.
	 */
	vms: {
		'ba155c91-1136-4632-a8bf-539d7152f534': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'e3d52038-64c3-42b0-99f1-b24ba57143eb': {
			owner_uuid: 'cfd6858c-9819-4599-bc11-35faf27ffc4c'
		},
		'addde32c-0a23-4b72-8d51-bb5de8abfcc1': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a3b3de-eb00-11e5-bbf2-534ba71488ee': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a42814-eb00-11e5-b618-a7b65e974f07': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a4a26c-eb00-11e5-8455-5356027f7edf': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a5106c-eb00-11e5-8b27-eb1dd6c3d909': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a57c3c-eb00-11e5-8747-13998d878315': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a5ecf8-eb00-11e5-b324-536ac68bb5a1': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a6725e-eb00-11e5-b300-4749d8fc07dd': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a71830-eb00-11e5-b87f-83a52418586c': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a7b524-eb00-11e5-808b-1fbe139b66ab': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'f6a85f06-eb00-11e5-92e3-8b00bab73fda': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		}
	}
}, {
	uuid: 'c141a106-eb00-11e5-ae33-b7201124575a',
	unreserved_ram: 768,
	vms: {
		'a21c9ea6-778c-49f6-9ffb-d0fd4eda9880': {
			owner_uuid: '079eb14f-727d-457d-83b0-7e443b6bff7f'
		},
		'39170a58-f56a-48e6-af47-030706c21454': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'87703e32-eb01-11e5-823a-cb2e64675eed': {
			owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106'
		},
		'bdd34e37-1fcc-48a9-8cf6-c8a03e475470': {
			owner_uuid: '1feb3f67-cc23-405b-a8d3-e64888a0b676'
		}
	}
}, {
	uuid: 'd037fff2-eb00-11e5-9322-0b32f8d3f898',
	unreserved_ram: 512,
	vms: {}
} ];


test('sortMinOwner()', function (t) {
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
	t.deepEqual(reasons, {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d': 12,
		'c141a106-eb00-11e5-ae33-b7201124575a': 2,
		'd037fff2-eb00-11e5-9322-0b32f8d3f898': 0
	});

	constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		pkg: {},
		defaults: { server_spread: 'min-owner' }
	};
	results = sorter.run(log, state, givenServers, constraints);
	t.deepEqual(results[0], expectedServers);


	t.end();
});


test('sortMinOwner() without pkg', function (t) {
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
	t.deepEqual(reasons, {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d': 12,
		'c141a106-eb00-11e5-ae33-b7201124575a': 2,
		'd037fff2-eb00-11e5-9322-0b32f8d3f898': 0
	});

	t.end();
});


test('sortMinOwner() skip wrong spread', function (t) {
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
	t.deepEqual(reasons,
		{skip: '"server_spread" is not "min-owner": random'});

	constraints = {
		vm: { owner_uuid: 'e6667010-7831-462f-ba1f-e345f8288106' },
		pkg: {},
		defaults: { server_spread: 'random' }
	};
	results = sorter.run(log, state, givenServers, constraints);
	t.deepEqual(results[0], givenServers);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (sorter.name), 'string');
	t.end();
});
