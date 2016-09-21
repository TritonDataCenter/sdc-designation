/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-large-servers.js');
var common = require('./common.js');


var SERVERS = [];
for (var ii = 0; ii < 20; ii++)
	SERVERS.push({ unreserved_ram: ii * 8 * 1024 });


var checkFilter = common.createPluginChecker(filter);


test('filterLargeServers()', function (t) {
	var expectServers = SERVERS.slice(0, SERVERS.length - 3).reverse();
	var expectReasons = {};
	var opts = { defaults: {} };

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterLargeServers() with override', function (t) {
	var expectServers = SERVERS;
	var expectReasons = { skip: 'Do not filter out large servers' };
	var opts = { defaults: { filter_large_servers: false } };

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterLargeServers with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};

	var opts = {
		vm: { ram: 34 * 1024 }, // in MiB
		defaults: {}
	};

	checkFilter(t, [], opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
