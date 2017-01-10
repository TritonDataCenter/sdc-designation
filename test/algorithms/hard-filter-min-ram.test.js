/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-min-ram.js');
var common = require('./common.js');


var checkFilter = common.createPluginChecker(filter);


test('filterMinRam()', function (t) {
	var servers = [ {
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		unreserved_ram: 256, overprovision_ratios: {}
	}, {
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		unreserved_ram: 511, overprovision_ratios: {}
	}, {
		uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
		unreserved_ram: 512,
		overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
		unreserved_ram: 768,
		overprovision_ratios: { ram: 1.0 }
	} ];

	var expectServers = servers.slice(0, 2);
	var expectReasons = {
		'7a8c759c-2a82-4d9b-bed4-7049b71197cb':
			'Package gave no RAM overprovision ratio, but server ' +
			'has ratio 1',
		'f60f7e40-2e92-47b8-8686-1b46a85dd35f':
			'Package gave no RAM overprovision ratio, but server ' +
			'has ratio 1'
	};

	var opts = {
		vm:  { ram: 512 },
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinRam() with KVM', function (t) {
	var servers = [ {
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		unreserved_ram: 256,
		overprovision_ratios: { ram: 2.0 }
	}, {
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		unreserved_ram: 511,
		overprovision_ratios: { ram: 2.0 }
	}, {
		uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
		unreserved_ram: 512,
		overprovision_ratios: { ram: 2.0 }
	}, {
		uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
		unreserved_ram: 768,
		overprovision_ratios: { ram: 2.0 }
	} ];

	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
			'VM\'s calculated 512 RAM is less than server\'s ' +
			'spare 256',
		'4fe12d99-f013-4983-9e39-6e2f35b37aec':
			'VM\'s calculated 512 RAM is less than server\'s ' +
			'spare 511'
	};

	var expectServers = servers.slice(2, 4);
	var opts = {
		vm:  { ram: 512, brand: 'kvm' },
		pkg: { overprovision_ram: 2.0 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinRam() without pkg', function (t) {
	var servers = [ {
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		unreserved_ram: 256, overprovision_ratios: {}
	}, {
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		unreserved_ram: 511, overprovision_ratios: {}
	}, {
		uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
		unreserved_ram: 512,
		overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
		unreserved_ram: 768,
		overprovision_ratios: { ram: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {};

	var opts = {
		vm: { ram: 512 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinRam() with override', function (t) {
	var servers = [ {
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		unreserved_ram: 256, overprovision_ratios: {}
	}, {
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		unreserved_ram: 511, overprovision_ratios: {}
	}, {
		uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
		unreserved_ram: 512,
		overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
		unreserved_ram: 768,
		overprovision_ratios: { ram: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {
		skip: 'Do not filter out based on minimum free RAM'
	};

	var opts = {
		vm:  { ram: 512 },
		pkg: {},
		defaults: { filter_min_resources: false }
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinRam() with overprovision ratios', function (t) {
	var servers = [ {
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		unreserved_ram: 256, overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		unreserved_ram: 511, overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
		unreserved_ram: 512, overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
		unreserved_ram: 768, overprovision_ratios: { ram: 1.0 }
	} ];

	var expectServers = servers.slice(2, 4);
	var expectReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		    'VM\'s calculated 512 RAM is less than server\'s spare 256',
		'4fe12d99-f013-4983-9e39-6e2f35b37aec':
		    'VM\'s calculated 512 RAM is less than server\'s spare 511'
	};

	var opts = {
		vm:  { ram: 768 },
		pkg: { overprovision_ram: 1.5 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinRam() with pkg ram instead of vm', function (t) {
	var servers = [ {
		uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
		unreserved_ram: 256, overprovision_ratios: {}
	}, {
		uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
		unreserved_ram: 511, overprovision_ratios: {}
	}, {
		uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
		unreserved_ram: 512,
		overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
		unreserved_ram: 768,
		overprovision_ratios: { ram: 1.0 }
	} ];

	var expectServers = servers.slice(2, 4);
	var expectReasons = {
		'4fe12d99-f013-4983-9e39-6e2f35b37aec':
		    'VM\'s calculated 512 RAM is less than server\'s spare 511',
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		    'VM\'s calculated 512 RAM is less than server\'s spare 256'
	};

	var opts = {
		vm: {},
		pkg: { max_physical_memory: 512, overprovision_ram: 1.0 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinRam() with no servers', function (t) {
	var servers = [];

	var expectServers = [];
	var expectReasons = {};

	var opts = {
		vm:  { ram: 512 },
		pkg: { overprovision_ram: 1.0 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
