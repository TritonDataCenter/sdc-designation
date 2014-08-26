/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/hard-filter-min-disk.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.filterMinDisk = function (t)
{
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
	var constraints = { vm: { quota: 5120 }, img: {}, pkg: {} };

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

	t.done();
};

exports.filterMinDisk_with_overprovision_ratios = function (t)
{
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

	var expectedServers = givenServers.slice(2, 4);
	var state = {};
	var constraints = {
		vm:  { quota: 7680 },
		img: {},
		pkg: { overprovision_disk: 1.5 }
	};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
		    'VM\'s calculated 5120 disk is less than ' +
		    'server\'s spare 2560',
		'9324d37d-e160-4a9d-a6d8-39a519634398':
		    'VM\'s calculated 5120 disk is less than ' +
		    'server\'s spare 5110'
	};
	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.filterMinDisk_with_no_servers = function (t)
{
	var state = {};
	var servers = [];
	var constraints = { vm: { quota: 5120 }, img: {}, pkg: {} };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.done();
};

exports.filterMinDisk_with_no_disk = function (t)
{
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
	var constraints = { vm: {}, img: {}, pkg: {} };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, givenServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.filterMinDisk_with_no_servers = function (t)
{
	var state = {};
	var servers = [];
	var constraints = {
		vm:  { quota: 5120 },
		img: {},
		pkg: { overprovision_disk: 1.0 }
	};

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
