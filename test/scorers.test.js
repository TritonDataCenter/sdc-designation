/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var scorers = require('../lib/scorers');


var LOG = {
	trace: function () { return (true); }
};


test('linear 1', function (t) {
	var score = scorers.linear;
	var reasons = {};

	var scores = score(LOG, [
		{ score: 1, uuid: '2bc943d3-1192-43d9-842a-38c20f556aea' },
		{ score: 1, uuid: '12caaf31-205f-4d2e-8269-945dee4ee7e5' },
		{ score: 1, uuid: 'e256bad8-8055-4754-b7ec-d308baca5fa9' }
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3, uuid: '2bc943d3-1192-43d9-842a-38c20f556aea' },
		{ score: 2, uuid: '12caaf31-205f-4d2e-8269-945dee4ee7e5' },
		{ score: 1, uuid: 'e256bad8-8055-4754-b7ec-d308baca5fa9' }
	]);

	t.deepEqual(reasons, {
		'2bc943d3-1192-43d9-842a-38c20f556aea':
			'increased score by 2.00 to 3.00',
		'12caaf31-205f-4d2e-8269-945dee4ee7e5':
			'increased score by 1.00 to 2.00',
		'e256bad8-8055-4754-b7ec-d308baca5fa9':
			'increased score by 0.00 to 1.00'
	});

	t.end();
});


test('linear 2', function (t) {
	var score = scorers.linear;
	var reasons = {};

	var scores = score(LOG, [
		{ score: 1, uuid: 'a04eb2a2-be1c-45ff-ae2b-4b60210b82c8' },
		{ score: 1, uuid: 'ee7436a3-5b7c-4279-9138-283e7d03e497' },
		{ score: 1, uuid: '48f3b143-0ba1-4894-8c09-26ff88ed8d31' }
	], 3, reasons);

	t.deepEqual(scores, [
		{ score: 4,   uuid: 'a04eb2a2-be1c-45ff-ae2b-4b60210b82c8' },
		{ score: 2.5, uuid: 'ee7436a3-5b7c-4279-9138-283e7d03e497' },
		{ score: 1,   uuid: '48f3b143-0ba1-4894-8c09-26ff88ed8d31' }
	]);

	t.deepEqual(reasons, {
		'a04eb2a2-be1c-45ff-ae2b-4b60210b82c8':
			'increased score by 3.00 to 4.00',
		'ee7436a3-5b7c-4279-9138-283e7d03e497':
			'increased score by 1.50 to 2.50',
		'48f3b143-0ba1-4894-8c09-26ff88ed8d31':
			'increased score by 0.00 to 1.00'
	});

	t.end();
});


test('linear 3', function (t) {
	var score = scorers.linear;
	var reasons = {};

	var scores = score(LOG, [
		{ score: 1, uuid: 'f56663e5-0187-47e9-9f35-463a2411e60b' },
		{ score: 1, uuid: '3caf33e7-e3e2-422d-bfbb-f0a6198e7856' }
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3, uuid: 'f56663e5-0187-47e9-9f35-463a2411e60b' },
		{ score: 1, uuid: '3caf33e7-e3e2-422d-bfbb-f0a6198e7856' }
	]);

	t.deepEqual(reasons, {
		'f56663e5-0187-47e9-9f35-463a2411e60b':
			'increased score by 2.00 to 3.00',
		'3caf33e7-e3e2-422d-bfbb-f0a6198e7856':
			'increased score by 0.00 to 1.00'
	});

	t.end();
});



test('linear 4', function (t) {
	var score = scorers.linear;
	var reasons = {};

	var scores = score(LOG, [
		{ score: 1, uuid: '4ff8d936-66fc-4ec9-909c-1c0d9fbaad58' }
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3, uuid: '4ff8d936-66fc-4ec9-909c-1c0d9fbaad58' }
	]);

	t.deepEqual(reasons, {
		'4ff8d936-66fc-4ec9-909c-1c0d9fbaad58':
			'increased score by 2.00 to 3.00'
	});

	t.end();
});


test('linearBuckets 1', function (t) {
	var score = scorers.linearBuckets;
	var reasons = {};

	var scores = score(LOG, [
		[ { score: 1 }, { score: 1 } ],
		[ { score: 1 }, { score: 1 } ],
		[ { score: 1 }, { score: 1 } ]
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3 }, { score: 3 },
		{ score: 2 }, { score: 2 },
		{ score: 1 }, { score: 1 }
	]);

	t.end();
});


test('linearBuckets 2', function (t) {
	var score = scorers.linearBuckets;
	var reasons = {};

	var scores = score(LOG, [
		[ { score: 1 } ],
		[ { score: 1 } ],
		[ { score: 1 } ]
	], 3, reasons);

	t.deepEqual(scores, [
		{ score: 4 },
		{ score: 2.5 },
		{ score: 1 }
	]);

	t.end();
});


test('linearBuckets 3', function (t) {
	var score = scorers.linearBuckets;
	var reasons = {};

	var scores = score(LOG, [
		[ { score: 1, uuid: '4a0e1dfa-6091-4eb6-84e1-b09e42dcbcc9' } ],
		[ { score: 1, uuid: 'faa02ab6-64ff-4279-97c9-7946481252ec' } ]
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3, uuid: '4a0e1dfa-6091-4eb6-84e1-b09e42dcbcc9' },
		{ score: 1, uuid: 'faa02ab6-64ff-4279-97c9-7946481252ec' }
	]);

	t.deepEqual(reasons, {
		'4a0e1dfa-6091-4eb6-84e1-b09e42dcbcc9':
			'increased score by 2.00 to 3.00',
		'faa02ab6-64ff-4279-97c9-7946481252ec':
			'increased score by 0.00 to 1.00'
	});

	t.end();
});


test('linearBuckets 4', function (t) {
	var score = scorers.linearBuckets;
	var reasons = {};

	var scores = score(LOG, [
		[ { score: 1, uuid: 'd758930b-b952-4cd1-a933-81dfc08f919c' } ]
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3, uuid: 'd758930b-b952-4cd1-a933-81dfc08f919c' }
	]);

	t.deepEqual(reasons, {
		'd758930b-b952-4cd1-a933-81dfc08f919c':
			'increased score by 2.00 to 3.00'
	});

	t.end();
});
