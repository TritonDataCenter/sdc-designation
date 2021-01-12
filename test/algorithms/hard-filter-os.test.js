/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2021 Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-os.js');
var common = require('./common.js');


var checkFilter = common.createPluginChecker(filter);


test('filterOS() no linux server', function (t) {
	var servers = [
		{
			sysinfo: {},
			uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc'
		},
		{
			sysinfo: {'System Type': 'SunOS'},
			uuid: '129e076a-7bdf-414d-b64c-ab5fe6f33d33'
		}
	];

	var expectServers = servers.slice(0, 2);
	var expectReasons = {};

	var opts = {
	vm:  { brand: 'joyent', ram: 512 },
	img: {},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterOS() no linux server (lxd image)', function (t) {
	var servers = [
		{
			sysinfo: {},
			uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc'
		},
		{
			sysinfo: {'System Type': 'SunOS'},
			uuid: '129e076a-7bdf-414d-b64c-ab5fe6f33d33'
		}
	];

	var expectServers = [];
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		'Server does not have "linux" OS',
		'129e076a-7bdf-414d-b64c-ab5fe6f33d33':
		'Server does not have "linux" OS'
	};

	var opts = {
	vm:  { brand: 'lx', ram: 512 },
	img: {type: 'lxd'},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterOS() one linux server', function (t) {
	var servers = [
		{
			sysinfo: {},
			uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc'
		},
		{
			sysinfo: {'System Type': 'linux'},
			uuid: '6c467bc8-9d86-4a10-9dd0-f98938b942bd'
		}
	];

	var expectServers = servers.slice(0, 1);
	var expectReasons = {
		'6c467bc8-9d86-4a10-9dd0-f98938b942bd':
		'Server does not have "SunOS" OS'
	};

	var opts = {
	vm:  { brand: 'joyent', ram: 512 },
	img: {},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterOS() one linux server (lxd image)', function (t) {
	var servers = [
		{
			sysinfo: {},
			uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc'
		},
		{
			sysinfo: {'System Type': 'linux'},
			uuid: '6c467bc8-9d86-4a10-9dd0-f98938b942bd'
		}
	];

	var expectServers = servers.slice(1);
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		'Server does not have "linux" OS'
	};

	var opts = {
	vm:  { brand: 'lx', ram: 512 },
	img: {type: 'lxd'},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
