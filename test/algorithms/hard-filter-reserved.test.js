/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-reserved.js');
var common = require('./common.js');


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var checkFilter = common.createPluginChecker(filter, LOG);


test('filterReserved()', function (t) {
	var servers = [
		{ memory_available_bytes: 128, reserved: false },
		{ memory_available_bytes: 384 },
		{ memory_available_bytes: 768, reserved: true }
	];

	var expectServers = servers.slice(0, 2);
	var expectReasons = {};

	var constraints = {};

	checkFilter(t, servers, constraints, expectServers, expectReasons);
});


test('filterReserved() with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};

	var constraints = {};

	checkFilter(t, [], constraints, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
