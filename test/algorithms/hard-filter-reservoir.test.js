/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-reservoir.js');
var common = require('./common.js');


var checkFilter = common.createPluginChecker(filter);


test('filterReservoir()', function (t) {
	var servers = [
		{ memory_available_bytes: 128, reservoir: false },
		{ memory_available_bytes: 384 },
		{ memory_available_bytes: 768, reservoir: true }
	];

	var expectServers = servers.slice(0, 2);
	var expectReasons = {};
	var opts = {};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterReservoir() with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};
	var opts = {};

	checkFilter(t, [], opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
