/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var assert = require('assert-plus');
var test = require('tape');
var scorer = require('../../lib/algorithms/score-uniform-random.js');
var common = require('./common');
var clone  = common.clone;


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


var checkScorer = common.createPluginChecker(scorer);


test('scoreUniformRandom()', function (t) {
	var opts = { defaults: { weight_uniform_random: 4 } };

	checkRandom(t, opts, 5);
});


test('scoreUniformRandom() with pkg set spread', function (t) {
	var opts = {
		defaults: { weight_uniform_random: 4 },
		pkg: { alloc_server_spread: 'random' }
	};

	checkRandom(t, opts, 3);
});


test('scoreUniformRandom() with defaults set spread', function (t) {
	var opts = {
		defaults: {
			weight_uniform_random: 4,
			server_spread: 'random'
		}
	};

	checkRandom(t, opts, 3);
});


test('scoreUniformRandom() with defaults and package attr', function (t) {
	var opts = {
		defaults: {
			weight_uniform_random: 4,
			server_spread: 'min-ram'
		},
		pkg: { alloc_server_spread: 'random' }
	};

	checkRandom(t, opts, 3);
});


test('scoreUniformRandom() skip wrong spread', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'pkg or default set to spread with: min-owner'
	};

	var opts = {
		defaults: {
			weight_uniform_random: 4,
			server_spread: 'min-owner'
		}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreUniformRandom() skip wrong spread', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {
		skip: 'pkg or default set to spread with: min-owner'
	};

	var opts = {
		defaults: { server_spread: 'min-owner' },
		pkg: {}
	};

	checkScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});


function
checkRandom(t, opts, expectedMax)
{
	assert.object(t, 't');
	assert.object(opts, 'opts');
	assert.number(expectedMax, 'expectedMax');

	opts = common.addCommonOpts(opts);

	var scores = SERVERS.map(function () { return ([]); });

	function iter(num) {
		if (num === 0) {
			return (checkScores());
		}

		return scorer.run(clone(SERVERS), opts,
				function (err, servers, reasons) {
			t.ifError(err);

			t.ok(reasons);

			for (var j = 0; j !== SERVERS.length; j++) {
				t.equal(servers[j].uuid, SERVERS[j].uuid);
				scores[j].push(servers[j].score);
			}

			iter(num - 1);
		});
	}

	function checkScores() {
		for (var k = 0; k !== SERVERS.length; k++) {
			var min = Math.min.apply(Math, scores[k]);
			var max = Math.max.apply(Math, scores[k]);

			t.equal(min, 1);
			t.equal(max, expectedMax);
		}

		t.end();
	}

	iter(25);
}
