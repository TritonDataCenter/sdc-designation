/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var scorer = require('../../lib/algorithms/score-unreserved-disk.js');
var common = require('./common');
var clone  = common.clone;


var SERVERS = [ {
	uuid: 'ef23ad0e-1802-4929-af61-387e9071d39f',
	score: 1,
	unreserved_disk: 256 * 1024
}, {
	uuid: '330ea9b9-0b4a-425d-8fc5-d31ccbfcc0cd',
	score: 1,
	unreserved_disk: 768 * 1024
}, {
	uuid: 'd3409329-e847-40a1-a924-119eacb69d9c',
	score: 1,
	unreserved_disk: 512 * 1024
} ];


var checkScorer = common.createPluginChecker(scorer);


test('scoreUnreservedDisk()', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 5;
	expectServers[1].score = 1;
	expectServers[2].score = 3;

	var expectReasons = {
		'ef23ad0e-1802-4929-af61-387e9071d39f':
			'increased score by 4.00 to 5.00',
		'330ea9b9-0b4a-425d-8fc5-d31ccbfcc0cd':
			'increased score by 0.00 to 1.00',
		'd3409329-e847-40a1-a924-119eacb69d9c':
			'increased score by 2.00 to 3.00'
	};

	var opts = { defaults: { weight_unreserved_disk: 4 } };

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreUnreservedDisk() with negative default weight', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 5;
	expectServers[2].score = 3;

	var expectReasons = {
		'ef23ad0e-1802-4929-af61-387e9071d39f':
			'increased score by 0.00 to 1.00',
		'330ea9b9-0b4a-425d-8fc5-d31ccbfcc0cd':
			'increased score by 4.00 to 5.00',
		'd3409329-e847-40a1-a924-119eacb69d9c':
			'increased score by 2.00 to 3.00'
	};

	var opts = { defaults: { weight_unreserved_disk: -4 } };

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreUnreservedDisk() with zero default weight', function (t) {
	var expectServers = SERVERS;
 	var expectReasons = {
		'skip': 'Resolved score weight to 0.00; no changes'
	};

	var opts = { defaults: { weight_unreserved_disk: 0 } };

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreUnreservedDisk() with any spread default set', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'pkg or default set to spread with: min-owner'
	};

	var opts = {
		defaults: {
			weight_unreserved_disk: 4,
			server_spread: 'min-owner'
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreUnreservedDisk() with any package attr set', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'pkg or default set to spread with: min-ram'
	};

	var opts = {
		defaults: {
			weight_unreserved_disk: 4
		},
		pkg: { alloc_server_spread: 'min-ram' }
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreUnreservedDisk() with one server', function (t) {
	var servers = [ SERVERS[0] ];
	var expectServers = clone(servers);
	expectServers[0].score = 5;

	var expectReasons = {
		'ef23ad0e-1802-4929-af61-387e9071d39f':
			'increased score by 4.00 to 5.00'
	};

	var opts = { defaults: { weight_unreserved_disk: 4 } };

	checkScorer(t, servers, opts, expectServers, expectReasons);
});


test('scoreUnreservedDisk() without servers', function (t) {
	var opts = { defaults: { weight_unreserved_disk: 4 } };

	checkScorer(t, [], opts, [], {});
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
