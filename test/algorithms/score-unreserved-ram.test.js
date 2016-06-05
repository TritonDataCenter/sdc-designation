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
var scorer = require('../../lib/algorithms/score-unreserved-ram.js');


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


test('scoreUnreservedRam()', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 5;
	expectedServers[1].score = 1;
	expectedServers[2].score = 3;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 4',
		'55d40d4b-296c-42c5-b8f2-295d094b7206': 'increased score by 0',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d': 'increased score by 2'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: 4 }
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with negative default weight', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 1;
	expectedServers[1].score = 5;
	expectedServers[2].score = 3;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 0',
		'55d40d4b-296c-42c5-b8f2-295d094b7206': 'increased score by 4',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d': 'increased score by 2'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: -4 }
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with zero default weight', function (t) {
	var expectedServers = SERVERS;
 	var expectedReasons = {
		skip: 'Resolved score weight to 0; no changes'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: 0 }
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with min-ram default set', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 3;
	expectedServers[1].score = 1;
	expectedServers[2].score = 2;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 2',
		'55d40d4b-296c-42c5-b8f2-295d094b7206': 'increased score by 0',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d': 'increased score by 1'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'min-ram'
		}
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with max-ram default set', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 1;
	expectedServers[1].score = 3;
	expectedServers[2].score = 2;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 0',
		'55d40d4b-296c-42c5-b8f2-295d094b7206': 'increased score by 2',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d': 'increased score by 1'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'max-ram'
		}
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with unrelated spread default set', function (t) {
	var expectedServers = clone(SERVERS);
	var expectedReasons = {
		skip: 'pkg or default set to score with other plugin'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'min-owner'
		}
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with package attr set', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 3;
	expectedServers[1].score = 1;
	expectedServers[2].score = 2;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 2',
		'55d40d4b-296c-42c5-b8f2-295d094b7206': 'increased score by 0',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d': 'increased score by 1'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4
		},
		pkg: { alloc_server_spread: 'min-ram' }
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with package and default set', function (t) {
	var expectedServers = clone(SERVERS);
	expectedServers[0].score = 3;
	expectedServers[1].score = 1;
	expectedServers[2].score = 2;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 2',
		'55d40d4b-296c-42c5-b8f2-295d094b7206': 'increased score by 0',
		'926c4009-93ed-4fd0-99d5-f3e73676f10d': 'increased score by 1'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4,
			server_spread: 'max-ram'
		},
		pkg: { alloc_server_spread: 'min-ram' }
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with unrelated package attr set', function (t) {
	var expectedServers = clone(SERVERS);
	var expectedReasons = {
		skip: 'pkg or default set to score with other plugin'
	};

	var constraints = {
		defaults: {
			weight_unreserved_ram: 4
		},
		pkg: { alloc_server_spread: 'min-owner' }
	};

	var results = scorer.run(LOG, clone(SERVERS), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() with one server', function (t) {
	var expectedServers = [ clone(SERVERS[0]) ];
	expectedServers[0].score = 5;

	var expectedReasons = {
		'26888f40-bae2-4b68-9053-c91bc82de296': 'increased score by 4'
	};

	var constraints = {
		defaults: { weight_unreserved_ram: 4 }
	};

	var results = scorer.run(LOG, clone([SERVERS[0]]), constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, expectedServers);
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('scoreUnreservedRam() without servers', function (t) {
	var constraints = {
		defaults: { weight_unreserved_ram: 4 }
	};

	var results = scorer.run(LOG, [], constraints);
	var scoredServers = results[0];
	var reasons = results[1];

	t.deepEqual(scoredServers, []);
	t.deepEqual(reasons, {});

	t.end();
});


test('name', function (t) {
	t.equal(typeof (scorer.name), 'string');
	t.end();
});
