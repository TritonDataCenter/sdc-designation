/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-setup.js');
var common = require('./common.js');


var checkFilter = common.createPluginChecker(filter);


test('filterSetup()', function (t) {
	var servers = [
		{ memory_available_bytes: 128 },
		{ memory_available_bytes: 256, setup: true },
		{ memory_available_bytes: 512, setup: false },
		{ memory_available_bytes: 768, setup: true }
	];

	var expectServers = [ servers[1], servers[3] ];
	var expectReasons = {};
	var opts = {};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterSetup() with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};
	var opts = {};

	checkFilter(t, [], opts, expectServers, expectReasons);
});


test('filterSetup() with malformed servers', function (t) {
	var givenServers = [ { setup: true }, { setup: false } ];

	var expectServers = [ givenServers[0] ];
	var expectReasons = {};
	var opts = {};

	filter.run(givenServers, opts, function (err, servers, reasons) {
		t.ifError(err);

		t.deepEqual(servers, expectServers);
		t.deepEqual(reasons, expectReasons);

		t.end();
	});
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
