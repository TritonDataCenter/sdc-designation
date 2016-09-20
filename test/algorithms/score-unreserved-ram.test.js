/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var scorer = require('../../lib/algorithms/score-unreserved-ram.js');
var common = require('./common');
var clone  = common.clone;


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var SERVERS = [ {
	uuid: '26888f40-bae2-4b68-9053-c91bc82de296',
	score: 1,
	unreserved_ram: 256
}, {
	uuid: '55d40d4b-296c-42c5-b8f2-295d094b7206',
	score: 1,
	unreserved_ram: 768
}, {
	uuid: '926c4009-93ed-4fd0-99d5-f3e73676f10d',
	score: 1,
	unreserved_ram: 512
} ];


var checkScorer = common.createPluginChecker(scorer, LOG);


test('scoreUnreservedRam()', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 5;
	expectServers[1].score = 1;
	expectServers[2].score = 3;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 4.00 to 5.00',
		'55d40d4b-296c-42c5-b8f2-295d094b7206':
			'increased score by 0.00 to 1.00',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d':
			'increased score by 2.00 to 3.00'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: 4 }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with negative default weight', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 5;
	expectServers[2].score = 3;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 0.00 to 1.00',
		'55d40d4b-296c-42c5-b8f2-295d094b7206':
			'increased score by 4.00 to 5.00',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d':
			'increased score by 2.00 to 3.00'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: -4 }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with zero default weight', function (t) {
	var expectServers = SERVERS;
 	var expectReasons = {
		skip: 'Resolved score weight to 0.00; no changes'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: 0 }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with min-ram default set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 3;
	expectServers[1].score = 1;
	expectServers[2].score = 2;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 2.00 to 3.00',
		'55d40d4b-296c-42c5-b8f2-295d094b7206':
			'increased score by 0.00 to 1.00',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d':
			'increased score by 1.00 to 2.00'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'min-ram'
		}
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with max-ram default set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 3;
	expectServers[2].score = 2;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 0.00 to 1.00',
		'55d40d4b-296c-42c5-b8f2-295d094b7206':
			'increased score by 2.00 to 3.00',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d':
			'increased score by 1.00 to 2.00'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'max-ram'
		}
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with unrelated spread default set', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'pkg or default set to score with other plugin'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'min-owner'
		}
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with package attr set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 3;
	expectServers[1].score = 1;
	expectServers[2].score = 2;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 2.00 to 3.00',
		'55d40d4b-296c-42c5-b8f2-295d094b7206':
			'increased score by 0.00 to 1.00',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d':
			'increased score by 1.00 to 2.00'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4
		},
		pkg: { alloc_server_spread: 'min-ram' }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with package and default set', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 3;
	expectServers[1].score = 1;
	expectServers[2].score = 2;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 2.00 to 3.00',
		'55d40d4b-296c-42c5-b8f2-295d094b7206':
			'increased score by 0.00 to 1.00',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d':
			'increased score by 1.00 to 2.00'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'max-ram'
		},
		pkg: { alloc_server_spread: 'min-ram' }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with unrelated package attr set', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'pkg or default set to score with other plugin'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4
		},
		pkg: { alloc_server_spread: 'min-owner' }
	};

	checkScorer(t, SERVERS, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() with one server', function (t) {
	var servers = [ SERVERS[0] ];

	var expectServers = clone(servers);
	expectServers[0].score = 5;

	var expectReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296':
			'increased score by 4.00 to 5.00'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: 4 }
	};

	checkScorer(t, servers, constraints, expectServers, expectReasons);
});


test('scoreUnreservedRam() without servers', function (t) {
	var constraints = {
		defaults: { weight_unreserved_ram: 4 }
	};

	checkScorer(t, [], constraints, [], {});
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
