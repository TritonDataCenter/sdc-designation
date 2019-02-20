/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2019, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-virtual-servers.js');
var common = require('./common.js');


var REASON_EXCLUDE_VIRTUAL_SERVER = 'Server is a virtual server - excluding';
var SERVERS = [
	{
		uuid: 'f0908343-5410-47b0-b6c4-b724a14ffda5',
		vms: {},
		sysinfo: {
			'System Type': 'Virtual'
		}
	},
	{
		uuid: '00C081e8-9577-87b1-e6c8-c624a14afbd5',
		vms : {}
	}
];


var checkFilter = common.createPluginChecker(filter);


test('filterVirtualServers() without flag', function _testVSNoFlag(t) {
	var expectServers = [ SERVERS[0], SERVERS[1] ];
	var expectReasons = {};

	var opts = { vm: {}, pkg: {} };

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});

test('filterVirtualServers() with exclude_virtual_servers tag set',
	function _testVSWithFlagSet(t) {
	var expectServers = [SERVERS[1]];
	var expectReasons = {};
	expectReasons[SERVERS[0].uuid] = REASON_EXCLUDE_VIRTUAL_SERVER;

	var opts = {
		vm: {
			tags: {
				'triton.placement.exclude_virtual_servers': true
			}
		},
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});

test('filterVirtualServers() for docker vm', function _testVSForDockerVm(t) {
	var expectServers = [SERVERS[1]];
	var expectReasons = {};
	expectReasons[SERVERS[0].uuid] = REASON_EXCLUDE_VIRTUAL_SERVER;

	var opts = {
		vm: {
			docker: true
		},
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});

test('name', function _testName(t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
