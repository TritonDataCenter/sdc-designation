/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2018, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-force-failure.js');
var common = require('./common.js');


var SERVERS = [ {
	uuid: 'f0908343-5410-47b0-b6c4-b724ab4ffda5',
	vms : {}
} ];


var checkFilter = common.createPluginChecker(filter);


test('filterForceFailure() with flag set true', function (t) {
	var expectServers = [];
	var expectReasons = {
		'f0908343-5410-47b0-b6c4-b724ab4ffda5':
		    'force_designation_failure set, failing'
	};

	var opts = {
		vm: {
			internal_metadata: {
				force_designation_failure: true
			}
		}, pkg: {
		}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterForceFailure() without flag', function (t) {
	var expectServers = [ SERVERS[0] ];
	var expectReasons = {};

	var opts = { vm: {}, pkg: {} };

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});

test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
