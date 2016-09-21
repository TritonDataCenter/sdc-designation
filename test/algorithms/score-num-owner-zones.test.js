/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

var test = require('tape');
var scorer = require('../../lib/algorithms/score-num-owner-zones.js');
var common = require('./common');
var clone  = common.clone;


var OWNER_UUID = 'e6667010-7831-462f-ba1f-e345f8288106';

var SERVERS = [ {
	uuid: 'b38dc3a0-eb00-11e5-943f-8bc57e287d0d',
	unreserved_ram: 256,
	/*
	 * Give the test owner (e666*) at least double-digit VMs here, because
	 * we want to test the surprise bug (DAPI-???) where `counts.sort()`
	 * did *string* comparison such that `4 > 10`.
	 */
	vms: {
		'ba155c91-1136-4632-a8bf-539d7152f534': {
			owner_uuid: OWNER_UUID
		},
		'e3d52038-64c3-42b0-99f1-b24ba57143eb': {
			owner_uuid: 'cfd6858c-9819-4599-bc11-35faf27ffc4c'
		},
		'addde32c-0a23-4b72-8d51-bb5de8abfcc1': {
			owner_uuid: OWNER_UUID
		},
		'f6a3b3de-eb00-11e5-bbf2-534ba71488ee': {
			owner_uuid: OWNER_UUID
		},
		'f6a42814-eb00-11e5-b618-a7b65e974f07': {
			owner_uuid: OWNER_UUID
		},
		'f6a4a26c-eb00-11e5-8455-5356027f7edf': {
			owner_uuid: OWNER_UUID
		},
		'f6a5106c-eb00-11e5-8b27-eb1dd6c3d909': {
			owner_uuid: OWNER_UUID
		},
		'f6a57c3c-eb00-11e5-8747-13998d878315': {
			owner_uuid: OWNER_UUID
		},
		'f6a5ecf8-eb00-11e5-b324-536ac68bb5a1': {
			owner_uuid: OWNER_UUID
		},
		'f6a6725e-eb00-11e5-b300-4749d8fc07dd': {
			owner_uuid: OWNER_UUID
		},
		'f6a71830-eb00-11e5-b87f-83a52418586c': {
			owner_uuid: OWNER_UUID
		},
		'f6a7b524-eb00-11e5-808b-1fbe139b66ab': {
			owner_uuid: OWNER_UUID
		},
		'f6a85f06-eb00-11e5-92e3-8b00bab73fda': {
			owner_uuid: OWNER_UUID
		}
	},
	score: 1
}, {
	uuid: 'c141a106-eb00-11e5-ae33-b7201124575a',
	unreserved_ram: 768,
	vms: {
		'a21c9ea6-778c-49f6-9ffb-d0fd4eda9880': {
			owner_uuid: '079eb14f-727d-457d-83b0-7e443b6bff7f'
		},
		'39170a58-f56a-48e6-af47-030706c21454': {
			owner_uuid: OWNER_UUID
		},
		'87703e32-eb01-11e5-823a-cb2e64675eed': {
			owner_uuid: OWNER_UUID
		},
		'bdd34e37-1fcc-48a9-8cf6-c8a03e475470': {
			owner_uuid: '1feb3f67-cc23-405b-a8d3-e64888a0b676'
		}
	},
	score: 1
}, {
	uuid: 'd037fff2-eb00-11e5-9322-0b32f8d3f898',
	unreserved_ram: 512,
	vms: {},
	score: 1
} ];


var checkScorer = common.createPluginChecker(scorer);


test('scoreNumOwnerZones()', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 3;
	expectServers[2].score = 5;

	var expectReasons = {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d':
			'increased score by 0.00 to 1.00; 12 owner zones found',
		'c141a106-eb00-11e5-ae33-b7201124575a':
			'increased score by 2.00 to 3.00; 2 owner zones found',
		'd037fff2-eb00-11e5-9322-0b32f8d3f898':
			'increased score by 4.00 to 5.00; 0 owner zones found'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		defaults: {
			weight_num_owner_zones: 4
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with negative default weight', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 5;
	expectServers[1].score = 3;
	expectServers[2].score = 1;

	var expectReasons = {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d':
			'increased score by 4.00 to 5.00; 12 owner zones found',
		'c141a106-eb00-11e5-ae33-b7201124575a':
			'increased score by 2.00 to 3.00; 2 owner zones found',
		'd037fff2-eb00-11e5-9322-0b32f8d3f898':
			'increased score by 0.00 to 1.00; 0 owner zones found'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		defaults: {
			weight_num_owner_zones: -4
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with zero default weight', function (t) {
	var expectServers = clone(SERVERS);
	var expectReasons = {
		skip: 'Resolved score weight to 0.00; no changes'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		defaults: {
			weight_num_owner_zones: 0
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with min-owner default set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 2;
	expectServers[2].score = 3;

	var expectReasons = {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d':
			'increased score by 0.00 to 1.00; 12 owner zones found',
		'c141a106-eb00-11e5-ae33-b7201124575a':
			'increased score by 1.00 to 2.00; 2 owner zones found',
		'd037fff2-eb00-11e5-9322-0b32f8d3f898':
			'increased score by 2.00 to 3.00; 0 owner zones found'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		defaults: {
			weight_num_owner_zones: 4,
			server_spread: 'min-owner'
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with unrelated spread default set', function (t) {
	var expectServers = clone(SERVERS);
	var expectReasons = {
		skip: 'pkg or default set to spread with: min-ram'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'min-ram'
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with min-owner package attr set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 2;
	expectServers[2].score = 3;

	var expectReasons = {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d':
			'increased score by 0.00 to 1.00; 12 owner zones found',
		'c141a106-eb00-11e5-ae33-b7201124575a':
			'increased score by 1.00 to 2.00; 2 owner zones found',
		'd037fff2-eb00-11e5-9322-0b32f8d3f898':
			'increased score by 2.00 to 3.00; 0 owner zones found'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		pkg: { alloc_server_spread: 'min-owner' },
		defaults: { weight_unreserved_ram: 4 }
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with package and default set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 2;
	expectServers[2].score = 3;

	var expectReasons = {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d':
			'increased score by 0.00 to 1.00; 12 owner zones found',
		'c141a106-eb00-11e5-ae33-b7201124575a':
			'increased score by 1.00 to 2.00; 2 owner zones found',
		'd037fff2-eb00-11e5-9322-0b32f8d3f898':
			'increased score by 2.00 to 3.00; 0 owner zones found'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		pkg: { alloc_server_spread: 'min-owner' },
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'max-ram'
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with unrelated package attr set', function (t) {
	var expectServers = clone(SERVERS);
	var expectReasons = {
		skip: 'pkg or default set to spread with: max-ram'
	};

	var opts = {
		vm:  { owner_uuid: OWNER_UUID },
		pkg: { alloc_server_spread: 'max-ram' },
		defaults: { weight_unreserved_ram: 4 }
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() with one server', function (t) {
	var servers = [SERVERS[0]];
	var expectServers = clone(servers);
	expectServers[0].score = 5;

	var expectReasons = {
		'b38dc3a0-eb00-11e5-943f-8bc57e287d0d':
			'increased score by 4.00 to 5.00; 12 owner zones found'
	};

	var opts = {
		vm: { owner_uuid: OWNER_UUID },
		defaults: { weight_num_owner_zones: 4 }
	};

	checkScorer(t, servers, opts, expectServers, expectReasons);
});


test('scoreNumOwnerZones() without servers', function (t) {
	var opts = {
		vm: { owner_uuid: OWNER_UUID },
		defaults: { weight_num_owner_zones: 4 }
	};

	checkScorer(t, [], opts, [], {});
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
