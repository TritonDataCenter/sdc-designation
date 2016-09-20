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
var common = require('./common');
var clone  = common.clone;


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var SERVERS = [ {
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


// helpers ---


var checkScorer = common.createPluginChecker(scorer, LOG);

var now;
function delta(days) {
	now = now || new Date();
	var addMs = days * 24 * 60 * 60 * 1000;
	return (new Date(+now + addMs).toISOString());
}


// tests ---


test('scoreNextReboot() - positive weight', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 3;
	expectServers[1].score = 3;
	expectServers[2].score = 2;
	expectServers[3].score = 4;
	expectServers[4].score = 4;
	expectServers[5].score = 1;

	var expectReasons = {
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

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreNextReboot() - negative weight', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 2;
	expectServers[1].score = 2;
	expectServers[2].score = 3;
	expectServers[3].score = 1;
	expectServers[4].score = 1;
	expectServers[5].score = 4;

	var expectReasons = {
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

	var constraints = {
		defaults: { weight_next_reboot: -3 }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreNextReboot() with one server', function (t) {
	var servers = [ {
		uuid: '62ccf0e0-268f-4f82-838a-218e4798d6c2',
		score: 1,
		next_reboot: '2016-04-20T14:01:56.447Z'
	} ];

	var expectServers = servers;
	var expectReasons = { skip: 'One or fewer servers' };

	var constraints = { defaults: {} };

	checkScorer(t, servers, constraints, expectServers, expectReasons);
});


test('scoreNextReboot() with no servers', function (t) {
	var expectReasons = { skip: 'One or fewer servers' };
	var constraints = { defaults: {} };

	checkScorer(t, [], constraints, [], expectReasons);
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
