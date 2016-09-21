/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var assert = require('assert-plus');
var scorer = require('../../lib/algorithms/score-current-platform.js');
var common = require('./common');
var clone  = common.clone;


var SERVERS = [ {
	uuid: '8973fb43-29da-474c-97b8-7c513c602a24',
	score: 1,
	current_platform: '20160305T083338Z'
}, {
	uuid: 'cc8c8619-21a8-403f-a4db-3061b38d5881',
	score: 1,
	current_platform: '20160304T083338Z'
}, {
	uuid: 'd68d4508-b153-4f3c-8121-b84c23848dcb',
	score: 1,
	current_platform: '20160301T083338Z'
}, {
	uuid: '64664347-aae4-49a9-b064-a144e142a8ed',
	score: 1,
	current_platform: '20160212T083338Z'
}, {
	uuid: 'b8ed3526-13a9-4da2-a6a8-06b142c51b77',
	score: 1,
	current_platform: '20160205T083338Z'
}, {
	uuid: '682de1bd-b409-4c51-affc-c21ad3ba8d81',
	score: 1,
	current_platform: '20150305T083338Z'
} ];


test('scoreCurrentPlatform()', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 3.9999999999999996;
	expectServers[1].score = 3.9918032786885242;
	expectServers[2].score = 3.9672131147540983;
	expectServers[3].score = 3.8196721311475406;
	expectServers[4].score = 3.762295081967213;
	expectServers[5].score = 1;

	var expectReasons = {
		'8973fb43-29da-474c-97b8-7c513c602a24':
			'increased score by 3.00 to 4.00',
		'cc8c8619-21a8-403f-a4db-3061b38d5881':
			'increased score by 2.99 to 3.99',
		'd68d4508-b153-4f3c-8121-b84c23848dcb':
			'increased score by 2.97 to 3.97',
		'64664347-aae4-49a9-b064-a144e142a8ed':
			'increased score by 2.82 to 3.82',
		'b8ed3526-13a9-4da2-a6a8-06b142c51b77':
			'increased score by 2.76 to 3.76',
		'682de1bd-b409-4c51-affc-c21ad3ba8d81':
			'increased score by 0.00 to 1.00'
	};

	var opts = { defaults: { weight_current_platform: 3 } };

	checkFixedScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreCurrentPlatform() with negative weight', function (t) {
	var expectServers = clone(SERVERS);
	expectServers[0].score = 1;
	expectServers[1].score = 1.0081967213114753;
	expectServers[2].score = 1.0327868852459017;
	expectServers[3].score = 1.180327868852459;
	expectServers[4].score = 1.2377049180327868;
	expectServers[5].score = 3.9999999999999996;

	var expectReasons = {
		'8973fb43-29da-474c-97b8-7c513c602a24':
			'increased score by 0.00 to 1.00',
		'cc8c8619-21a8-403f-a4db-3061b38d5881':
			'increased score by 0.01 to 1.01',
		'd68d4508-b153-4f3c-8121-b84c23848dcb':
			'increased score by 0.03 to 1.03',
		'64664347-aae4-49a9-b064-a144e142a8ed':
			'increased score by 0.18 to 1.18',
		'b8ed3526-13a9-4da2-a6a8-06b142c51b77':
			'increased score by 0.24 to 1.24',
		'682de1bd-b409-4c51-affc-c21ad3ba8d81':
			'increased score by 3.00 to 4.00'
	};

	var opts = { defaults: { weight_current_platform: -3 } };

	checkFixedScorer(t, SERVERS, opts, expectServers, expectReasons);
});


test('scoreCurrentPlatform() with one server', function (t) {
	var servers = [ SERVERS[0] ];
	var expectServers = servers;
	var expectReasons = { skip: 'One or fewer servers' };
	var opts = { defaults: {} };

	checkFixedScorer(t, servers, opts, expectServers, expectReasons);
});


test('scoreCurrentPlatform() with no servers', function (t) {
	var expectReasons = { skip: 'One or fewer servers' };
	var opts = { defaults: {} };

	checkFixedScorer(t, [], opts, [], expectReasons);
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});


// helpers ---


function checkFixedScorer(t, givenServers, opts, expectServers, expectReasons) {
	assert.object(t, 't');
	assert.arrayOfObject(givenServers, 'givenServers');
	assert.object(opts, 'opts');
	assert.arrayOfObject(expectServers, 'expectServers');
	assert.object(expectReasons, 'expectReasons');

	opts = common.addCommonOpts(opts);

	scorer.run(clone(givenServers), opts, function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(fixedScore(servers), fixedScore(expectServers));
		t.deepEqual(reasons, expectReasons);

		t.end();
	});
}


// Comparing floats is troublesome, so we convert the float scores
// to fixed strings. Not ideal, but works.
function fixedScore(servers) {
	servers.forEach(function (server) {
		server.score = server.score.toFixed(5);
	});

	return (servers);
}
