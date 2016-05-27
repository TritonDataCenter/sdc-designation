/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var clone = require('./common').clone;
var scorer = require('../../lib/algorithms/score-unreserved-disk.js');


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

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


test('scoreUnreservedDisk()', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 5;
	expectedServers[1].score = 1;
	expectedServers[2].score = 3;

	var expectedReasons = {
		'ef23ad0e-1802-4929-af61-387e9071d39f': 'increased score by 4',
		'330ea9b9-0b4a-425d-8fc5-d31ccbfcc0cd': 'increased score by 0',
		'd3409329-e847-40a1-a924-119eacb69d9c': 'increased score by 2'
	};

	var state = {};
	var constraints = {
		defaults: { weight_unreserved_disk: 4 }
	};

	var results = scorer.run(LOG, state, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedDisk() with negative default weight', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 1;
	expectedServers[1].score = 5;
	expectedServers[2].score = 3;

	var expectedReasons = {
		'ef23ad0e-1802-4929-af61-387e9071d39f': 'increased score by 0',
		'330ea9b9-0b4a-425d-8fc5-d31ccbfcc0cd': 'increased score by 4',
		'd3409329-e847-40a1-a924-119eacb69d9c': 'increased score by 2'
	};

	var state = {};
	var constraints = {
		defaults: { weight_unreserved_disk: -4 }
	};

	var results = scorer.run(LOG, state, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedDisk() with zero default weight', function (t) {
	var expectedServers = SERVERS;
 	var expectedReasons = {
		'skip': 'Resolved score weight to 0; no changes'
	};

	var state = {};
	var constraints = {
		defaults: { weight_unreserved_disk: 0 }
	};

	var results = scorer.run(LOG, state, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedDisk() with any spread default set', function (t) {
	var expectedServers = clone(SERVERS);
	var expectedReasons = {
		skip: 'pkg or default set to spread with: min-owner'
	};

	var state = {};
	var constraints = {
		defaults: {
			weight_unreserved_disk: 4,
			server_spread: 'min-owner'
		}
	};

	var results = scorer.run(LOG, state, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedDisk() with any package attr set', function (t) {
	var expectedServers = clone(SERVERS);
	var expectedReasons = {
		skip: 'pkg or default set to spread with: min-ram'
	};

	var state = {};
	var constraints = {
		defaults: {
			weight_unreserved_disk: 4
		},
		pkg: { alloc_server_spread: 'min-ram' }
	};

	var results = scorer.run(LOG, state, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedDisk() with one server', function (t) {
	var expectedServers = [ clone(SERVERS[0]) ];
	expectedServers[0].score = 5;

	var expectedReasons = {
		'ef23ad0e-1802-4929-af61-387e9071d39f': 'increased score by 4'
	};

	var state = {};
	var constraints = {
		defaults: { weight_unreserved_disk: 4 }
	};

	var results = scorer.run(LOG, state, clone([SERVERS[0]]), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedDisk() without servers', function (t) {
	var state = {};
	var constraints = {
		defaults: { weight_unreserved_disk: 4 }
	};

	var results = scorer.run(LOG, state, [], constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, []);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.end();
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
