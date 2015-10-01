/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-min-disk.js');


var MiB = 1024 * 1024;
var GiB = 1024 * MiB;

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('filterMinDisk()', function (t) {
	var givenServers = [
		{
			uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
			unreserved_disk: 2560,
			overprovision_ratios: {}
		},
		{
			uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
			unreserved_disk: 5110,
			overprovision_ratios: {}
		},
		{
			uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
			unreserved_disk: 5120,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
			unreserved_disk: 7680,
			overprovision_ratios: { disk: 1.0 }
		}
	];

	var expectedServers = givenServers.slice(0, 2);
	var state = {};
	var constraints = {
		vm: { quota: 5120 },
		img: {},
		pkg: {},
		defaults: {}
	};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'f07f6c2c-8f9c-4b77-89fe-4b777dff5826':
		    'Package gave no disk overprovision ratio, but server ' +
		    'has ratio 1',
		'69003dc2-1122-4851-8a2a-fccb609e4e84':
		    'Package gave no disk overprovision ratio, but server ' +
		    'has ratio 1'
	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterMinDisk() without pkg', function (t) {
	var givenServers = [
		{
			uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
			unreserved_disk: 2560,
			overprovision_ratios: {}
		},
		{
			uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
			unreserved_disk: 5110,
			overprovision_ratios: {}
		},
		{
			uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
			unreserved_disk: 5120,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
			unreserved_disk: 7680,
			overprovision_ratios: { disk: 1.0 }
		}
	];

	var expectedServers = givenServers;
	var state = {};
	var constraints = {
		vm: { quota: 5120 },
		img: {},
		defaults: {}
	};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.end();
});


test('filterMinDisk() with override', function (t) {
	var givenServers = [
		{
			uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
			unreserved_disk: 2560,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
			unreserved_disk: 5110,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
			unreserved_disk: 5120,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
			unreserved_disk: 7680,
			overprovision_ratios: { disk: 1.0 }
		}
	];

	var state = {};
	var constraints = {
		vm: { quota: 5120 },
		img: {},
		pkg: {},
		defaults: { filter_min_resources: false }
	};

	var results = filter.run(log, state, givenServers, constraints);

	t.deepEqual(results[0], givenServers);
	t.deepEqual(state, {});

	t.end();
});


test('filterMinDisk() with overprovision ratios - kvm', function (t) {
	var givenServers = [
		{
			uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
			unreserved_disk: 25600,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
			unreserved_disk: 50000,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
			unreserved_disk: 51200,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
			unreserved_disk: 76800,
			overprovision_ratios: { disk: 1.0 }
		}
	];

	var expectedServers = givenServers.slice(2, 4);
	var state = {};
	var constraints = {
		vm:  { quota: 10 }, // in GiB
		img: {
			type: 'zvol',
			image_size: 10 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: {
			quota: 29 * 1024, // in MiB
			overprovision_disk: 1.5
		},
		defaults: {}
	};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
		    'VM\'s calculated 50326 MiB disk is more than ' +
		    'server\'s spare 25600 MiB',
		'9324d37d-e160-4a9d-a6d8-39a519634398':
		    'VM\'s calculated 50326 MiB disk is more than ' +
		    'server\'s spare 50000 MiB'
	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterMinDisk() with overprovision ratios - zone', function (t) {
	var givenServers = [
		{
			uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
			unreserved_disk: 25600,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
			unreserved_disk: 50000,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
			unreserved_disk: 51200,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
			unreserved_disk: 76800,
			overprovision_ratios: { disk: 1.0 }
		}
	];

	var expectedServers = givenServers.slice(1, 4);
	var state = {};
	var constraints = {
		vm:  { quota: 29 }, // in GiB
		img: {
			image_size: 10 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: {
			quota: 29 * 1024, // in MiB
			overprovision_disk: 1.5
		},
		defaults: {}
	};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
		    'VM\'s calculated 30188 MiB disk is more than ' +
		    'server\'s spare 25600 MiB'
	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterMinDisk() with no servers', function (t) {
	var state = {};
	var servers = [];
	var constraints = {
		vm: { quota: 5 }, // in GiB
		img: {
			image_size: 1 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: { overprovision_disk: 1.0 },
		defaults: {}
	};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.end();
});


test('filterMinDisk() with no disk', function (t) {
	var givenServers = [
		{
			uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
			unreserved_disk: 2560,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
			unreserved_disk: 5110,
			overprovision_ratios: { disk: 1.0 }
		},
		{
			uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
			unreserved_disk: 5120,
			overprovision_ratios: { disk: 1.0 }
		}
	];

	var state = {};
	var constraints = { vm: {}, img: {}, pkg: {}, defaults: {} };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, givenServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
