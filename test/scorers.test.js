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


test('linear', function (t) {
	var score = scorers.linear;

	var reasons = {};
	var scores = score(LOG, [
		{ score: 1 },
		{ score: 1 },
		{ score: 1 }
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3 },
		{ score: 2 },
		{ score: 1 }
	]);

	scores = score(LOG, [
		{ score: 1 },
		{ score: 1 },
		{ score: 1 }
	], 3, reasons);

	t.deepEqual(scores, [
		{ score: 4 },
		{ score: 2.5 },
		{ score: 1 }
	]);

	scores = score(LOG, [
		{ score: 1 },
		{ score: 1 }
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3 },
		{ score: 1 }
	]);

	scores = score(LOG, [ { score: 1 } ], 2, reasons);
	t.deepEqual(scores, [ { score: 3 } ]);

	t.end();
});


test('linearBuckets', function (t) {
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

	scores = score(LOG, [
		[ { score: 1 } ],
		[ { score: 1 } ],
		[ { score: 1 } ]
	], 3, reasons);

	t.deepEqual(scores, [
		{ score: 4 },
		{ score: 2.5 },
		{ score: 1 }
	]);

	scores = score(LOG, [
		[ { score: 1 } ],
		[ { score: 1 } ]
	], 2, reasons);

	t.deepEqual(scores, [
		{ score: 3 },
		{ score: 1 }
	]);

	scores = score(LOG, [ [ { score: 1 } ] ], 2, reasons);
	t.deepEqual(scores, [ { score: 3 } ]);

	t.end();
});
