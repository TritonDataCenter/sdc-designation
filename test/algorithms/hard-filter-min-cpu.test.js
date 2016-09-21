/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-min-cpu.js');
var common = require('./common.js');


var checkFilter = common.createPluginChecker(filter);


test('filterMinCpu()', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_cpu: 400,
		overprovision_ratios: {}
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_cpu: 590,
		overprovision_ratios: {}
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_cpu: 610,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_cpu: 900,
		overprovision_ratios: { cpu: 1.0 }
	} ];

	var expectServers = servers.slice(0, 2);
	var expectReasons = {
		'f07f6c2c-8f9c-4b77-89fe-4b777dff5826':
			'Package gave no CPU overprovision ratio, ' +
			'but server has ratio 1',
		'69003dc2-1122-4851-8a2a-fccb609e4e84':
			'Package gave no CPU overprovision ratio, ' +
			'but server has ratio 1'
	};

	var opts = {
		vm: { cpu_cap: 900 },
		img: {},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinCpu() without pkg', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_cpu: 400,
		overprovision_ratios: {}
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_cpu: 590,
		overprovision_ratios: {}
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_cpu: 610,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_cpu: 900,
		overprovision_ratios: { cpu: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {};

	var opts = {
		vm: { cpu_cap: 900 },
		img: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinCpu() with override', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_cpu: 400,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_cpu: 590,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_cpu: 610,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_cpu: 900,
		overprovision_ratios: { cpu: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {
		skip: 'Do not filter out based on minimum free CPU'
	};

	var opts = {
		vm: { cpu_cap: 900 },
		img: {},
		pkg: {},
		defaults: { filter_min_resources: false }
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinCpu() with overprovision ratios', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_cpu: 400,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_cpu: 590,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_cpu: 610,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_cpu: 900,
		overprovision_ratios: { cpu: 1.0 }
	} ];

	var expectServers = servers.slice(2, 4);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 600 CPU is less than ' +
			'server\'s spare 400',
		'9324d37d-e160-4a9d-a6d8-39a519634398':
			'VM\'s calculated 600 CPU is less than ' +
			'server\'s spare 590'
	};

	var opts = {
		vm:  { cpu_cap: 900 },
		img: {},
		pkg: { overprovision_cpu: 1.5 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinCpu with no cpu', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_cpu: 400,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_cpu: 600,
		overprovision_ratios: { cpu: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_cpu: 650,
		overprovision_ratios: { cpu: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {};

	var opts = {
		vm: {},
		img: {},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinCpu() with no servers', function (t) {
	var servers = [];

	var expectServers = [];
	var expectReasons = {};

	var opts = {
		vm:  { cpu_cap: 900 },
		img: {},
		pkg: { overprovision_cpu: 1.0 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
