/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var identity = require('../../lib/algorithms/identity.js');
var common = require('./common.js');


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var checkPlugin = common.createPluginChecker(identity, LOG);


test('identity()', function (t) {
	var servers = [
		{ unreserved_ram: 256 },
		{ unreserved_ram: 511 },
		{ unreserved_ram: 512 },
		{ unreserved_ram: 768 }
	];

	var expectServers = servers;
	var expectReasons = {};

	var constraints = {};

	checkPlugin(t, servers, constraints, expectServers, expectReasons);
});


test('identity() with no servers', function (t) {
	checkPlugin(t, [], {}, [], {});
});


test('name', function (t) {
	t.ok(typeof (identity.name) === 'string');
	t.end();
});
