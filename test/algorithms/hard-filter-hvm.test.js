/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2018, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-hvm.js');
var common = require('./common.js');


var checkFilter = common.createPluginChecker(filter);


test('filterHVM() with joyent', function (t) {
	var servers = [ {
		sysinfo: { 'Bhyve Capable': true },
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: [
			{ brand: 'bhyve' },
			{ brand: 'kvm' }
		]
	} ];

	var expectServers = servers.slice(0, 1);
	var expectReasons = {};

	var opts = {
		vm:  { brand: 'joyent', ram: 512 },
		pkg: {},
		defaults: {}
	};

	// With brand=joyent, it really shouldn't matter which other
	// instances are on the system.

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterHVM() with kvm and no existing VMs', function (t) {
	var servers = [ {
		sysinfo: {},
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	} ];

	var expectServers = servers.slice(0, 1);
	var expectReasons = {};

	var opts = {
		vm:  { brand: 'kvm', ram: 512 },
		pkg: {},
		defaults: {}
	};

	// no existing VMs, so kvm should be fine on the only server

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterHVM() with bhyve and mixed HW support', function (t) {
	var servers = [ {
		sysinfo: { 'Bhyve Capable': true },
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	}, {
		sysinfo: {},
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		vms: []
	} ];

	var expectServers = servers.slice(0, 1);
	var expectReasons = {
		'4fe12d99-f013-4983-9e39-6e2f35b37aec':
			'Server does not support "bhyve" VMs'
	};

	var opts = {
		vm:  { brand: 'bhyve', ram: 512, vcpus: 1 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterHVM() with bhyve and existing kvm', function (t) {
	var servers = [ {
		sysinfo: { 'Bhyve Capable': true },
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: [ {
			brand: 'kvm',
			uuid: '3ac37ee8-16a9-11e8-a114-9bd01a859c7f'
		}]
	}, {
		sysinfo: { 'Bhyve Capable': true },
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		vms: []
	} ];

	var expectServers = servers.slice(1, 2);
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
			'VM 3ac37ee8-16a9-11e8-a114-9bd01a859c7f has ' +
			'brand kvm which is incompatible with new VMs ' +
			'using brand bhyve'
	};

	var opts = {
		vm:  { brand: 'bhyve', ram: 512, vcpus: 1 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterHVM() with kvm and existing bhyve', function (t) {
	var servers = [ {
		sysinfo: { 'Bhyve Capable': true },
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: [ {
			brand: 'bhyve',
			uuid: '3ac37ee8-16a9-11e8-a114-9bd01a859c7f'
		} ]
	}, {
		sysinfo: { 'Bhyve Capable': true },
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		vms: []
	} ];

	var expectServers = servers.slice(1, 2);
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
			'VM 3ac37ee8-16a9-11e8-a114-9bd01a859c7f has brand ' +
			'bhyve which is incompatible with new VMs using ' +
			'brand kvm'
	};

	var opts = {
		vm:  { brand: 'kvm', ram: 512 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterHVM() with no servers', function (t) {
	var servers = [];

	var expectServers = [];
	var expectReasons = {};

	var opts = {
		vm:  { brand: 'joyent', ram: 512 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


// Ensure that when bhyve supports more than the system, we don't allow more
// than the total.
test('filterHVM() vcpus total less than bhyve -- over', function (t) {
	var servers = [ {
		sysinfo: {
			'Bhyve Capable': true,
			'Bhyve Max Vcpus': 56,
			'CPU Total Cores': 32
		},
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	} ];

	var expectServers = [];
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		    'bhyve VM undefined is requesting 33 vcpus whereas ' +
		    'server supports 1 - 32 vcpus'
	};

	var opts = {
		vm:  { brand: 'bhyve', ram: 512, vcpus: 33 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});

// Same as above but with 32 and it should succeed
test('filterHVM() vcpus total less than bhyve -- under', function (t) {
	var servers = [ {
		sysinfo: {
			'Bhyve Capable': true,
			'Bhyve Max Vcpus': 56,
			'CPU Total Cores': 32
		},
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	} ];

	var expectServers = servers.slice(0, 1);
	var expectReasons = {};

	var opts = {
		vm:  { brand: 'bhyve', ram: 512, vcpus: 32 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});

// 0 is too few
test('filterHVM() 0 vcpus bhyve', function (t) {
	var servers = [ {
		sysinfo: {
			'Bhyve Capable': true,
			'Bhyve Max Vcpus': 32,
			'CPU Total Cores': 32
		},
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	} ];

	var expectServers = [];
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		    'bhyve VM undefined is requesting -1 vcpus whereas ' +
		    'server supports 1 - 32 vcpus'
	};

	var opts = {
		vm:  { brand: 'bhyve', ram: 512, vcpus: 0 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});

// 1 is fine
test('filterHVM() 1 vcpus bhyve', function (t) {
	var servers = [ {
		sysinfo: {
			'Bhyve Capable': true,
			'Bhyve Max Vcpus': 32,
			'CPU Total Cores': 32
		},
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		vms: []
	} ];

	var expectServers = servers.slice(0, 1);
	var expectReasons = {};

	var opts = {
		vm:  { brand: 'bhyve', ram: 512, vcpus: 1 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
