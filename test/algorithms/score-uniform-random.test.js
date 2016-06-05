/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var scorer = require('../../lib/algorithms/score-uniform-random.js');
var clone = require('./common').clone;


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var SERVERS = [ {
	uuid: '59eb4f1b-c9a7-41c7-8ab0-2142da53d62f',
	score: 1
}, {
	uuid: '8b687457-3872-4bc7-89d7-647f0e432e53',
	score: 1
}, {
	uuid: '44f87d8b-ad44-4adf-8d67-5c0cf917a41c',
	score: 1
} ];


test('scoreUniformRandom()', function (t) {
	var constraints = { defaults: { weight_uniform_random: 4 } };
	checkRandom(t, constraints, 5);
});

test('scoreUniformRandom() with pkg set spread', function (t) {
	var constraints = {
		defaults: { weight_uniform_random: 4 },
		pkg: { alloc_server_spread: 'random' }
	};

	checkRandom(t, constraints, 3);
});


test('scoreUniformRandom() with defaults set spread', function (t) {
	var constraints = {
		defaults: {
			weight_uniform_random: 4,
			server_spread: 'random'
		}
	};

	checkRandom(t, constraints, 3);
});


test('scoreUniformRandom() with defaults and package attr', function (t) {
	var constraints = {
		defaults: {
			weight_uniform_random: 4,
			server_spread: 'min-ram'
		},
		pkg: { alloc_server_spread: 'random' }
	};

	checkRandom(t, constraints, 3);
});


test('scoreUniformRandom() skip wrong spread', function (t) {
	var constraints = {
		defaults: {
			weight_uniform_random: 4,
			server_spread: 'min-owner'
		}
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, SERVERS);
	t.deepEqual(reasons, {
		skip: 'pkg or default set to spread with: min-owner'
	});

	constraints = { pkg: {}, defaults: { server_spread: 'min-owner' } };
	results = scorer.run(LOG, clone(SERVERS), constraints);
	t.deepEqual(results[0], SERVERS);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});


function
checkRandom(t, constraints, expectedMax)
{
	var scores = SERVERS.map(function () { return ([]); });

	for (var i = 0; i !== 25; i++) {
		var results = scorer.run(LOG, clone(SERVERS), constraints);
		var scored = results[0];
		var reasons = results[1];

		t.ok(reasons);

		for (var j = 0; j !== SERVERS.length; j++) {
			t.equal(scored[j].uuid, SERVERS[j].uuid);
			scores[j].push(scored[j].score);
		}
	}

	for (var k = 0; k !== SERVERS.length; k++) {
		var min = Math.min.apply(Math, scores[k]);
		var max = Math.max.apply(Math, scores[k]);

		t.equal(min, 1);
		t.equal(max, expectedMax);
	}

	t.end();
}
