/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2019 Joyent, Inc.
 */

const test = require('tape');
const filter = require('../../lib/algorithms/hard-filter-zpool-encryption');
const common = require('./common.js');

const checkFilter = common.createPluginChecker(filter);

test('filterZpoolEncryption() with no servers', function (t) {
	var servers = [];

	var expectServers = [];
	var expectReasons = {};

	var opts = {
		vm: { brand: 'joyent', ram: 512 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});

test('filterZpoolEncryption() w/o encrypted servers', function (t) {
	var servers = [ {
		sysinfo: { },
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: [
			{ brand: 'bhyve' },
			{ brand: 'kvm' },
			{ brand: 'joyent' }
		]
	} ];

	var expectServers = [];
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
			'Server is not Zpool Encrypted'
	};

	var opts = {
		vm: {
			brand: 'joyent',
			ram: 512,
			internal_metadata: {
				encrypted: true
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterZpoolEncryption() with encrypted severs', function (t) {
	var servers = [ {
		sysinfo: {},
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		vms: []
	}, {
		sysinfo: { 'Zpool Encrypted': true },
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	} ];

	var expectServers = servers.slice(1, 2);
	var expectReasons = {
		'4fe12d99-f013-4983-9e39-6e2f35b37aec':
			'Server is not Zpool Encrypted'
	};
	var opts = {
		vm: {
			brand: 'joyent',
			ram: 512,
			vcpus: 1,
			internal_metadata: {
				encrypted: true
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
