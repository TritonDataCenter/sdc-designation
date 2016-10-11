/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var scorer = require('../../lib/algorithms/score-next-reboot.js');
var clone = require('./common').clone;


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('scoreNextReboot()', function (t) {
	var now = new Date();
	function delta(days) {
		var addMs = days * 24 * 60 * 60 * 1000;
		return (new Date(+now + addMs).toISOString());
	}

	var givenServers = [ {
		uuid: '62ccf0e0-268f-4f82-838a-218e4798d6c2',
		score: 1,
		next_reboot: delta(75)
	}, {
		uuid: 'ad60a3e7-497c-4876-b074-79bf041b7086',
		score: 1,
		next_reboot: delta(70)
	}, {
		uuid: '7fbf5802-26b0-4e14-bbce-87e44c6aa926',
		score: 1,
		next_reboot: delta(10)
	}, {
		uuid: '0cb6d02c-a0de-4edd-95fd-30a71a397f71',
		score: 1
	}, {
		uuid: '44710ff2-57e6-45df-9d87-9844fd3c216f',
		score: 1,
		next_reboot: delta(-35),
		last_boot: delta(-30)
	}, {
		uuid: '3b4157cd-8f2e-4d57-b7a0-bb43bea5455c',
		score: 1,
		next_reboot: delta(0),
		last_boot: delta(-30)
	} ];

	var expectedServers = clone(givenServers);
	expectedServers[0].score = 3;
	expectedServers[1].score = 3;
	expectedServers[2].score = 2;
	expectedServers[3].score = 4;
	expectedServers[4].score = 4;
	expectedServers[5].score = 1;

	var expectedReasons = {
		'0cb6d02c-a0de-4edd-95fd-30a71a397f71':
			'increased score by 3.00 to 4.00',
		'3b4157cd-8f2e-4d57-b7a0-bb43bea5455c':
			'increased score by 0.00 to 1.00',
		'44710ff2-57e6-45df-9d87-9844fd3c216f':
			'increased score by 3.00 to 4.00',
		'62ccf0e0-268f-4f82-838a-218e4798d6c2':
			'increased score by 2.00 to 3.00',
		'7fbf5802-26b0-4e14-bbce-87e44c6aa926':
			'increased score by 1.00 to 2.00',
		'ad60a3e7-497c-4876-b074-79bf041b7086':
			'increased score by 2.00 to 3.00'
	};

	var constraints = {
		defaults: { weight_next_reboot: 3 }
	};

	var results = scorer.run(LOG, clone(givenServers), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	// now try with a negative weight ---

	expectedServers[0].score = 2;
	expectedServers[1].score = 2;
	expectedServers[2].score = 3;
	expectedServers[3].score = 1;
	expectedServers[4].score = 1;
	expectedServers[5].score = 4;

	expectedReasons = {
		'0cb6d02c-a0de-4edd-95fd-30a71a397f71':
			'increased score by 0.00 to 1.00',
		'3b4157cd-8f2e-4d57-b7a0-bb43bea5455c':
			'increased score by 3.00 to 4.00',
		'44710ff2-57e6-45df-9d87-9844fd3c216f':
			'increased score by 0.00 to 1.00',
		'62ccf0e0-268f-4f82-838a-218e4798d6c2':
			'increased score by 1.00 to 2.00',
		'7fbf5802-26b0-4e14-bbce-87e44c6aa926':
			'increased score by 2.00 to 3.00',
		'ad60a3e7-497c-4876-b074-79bf041b7086':
			'increased score by 1.00 to 2.00'
	};

	constraints = {
		defaults: { weight_next_reboot: -3 }
	};

	results = scorer.run(LOG, clone(givenServers), constraints);
	scoredServers = results[0];
	reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreNextReboot() with one server', function (t) {
	var givenServers = [ {
		uuid: '62ccf0e0-268f-4f82-838a-218e4798d6c2',
		score: 1,
		next_reboot: '2016-04-20T14:01:56.447Z'
	} ];

	var results = scorer.run(LOG, givenServers, {});
	var servers = results[0];
	var reasons = results[1];

	t.deepEqual(servers, clone(givenServers));
	t.deepEqual(reasons, { skip: 'One or fewer servers' });

	t.end();
});


test('scoreNextReboot() with no servers', function (t) {
	var results = scorer.run(LOG, [], {});
	var servers = results[0];
	var reasons = results[1];

	t.deepEqual(servers, []);
	t.deepEqual(reasons, { skip: 'One or fewer servers' });

	t.end();
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
