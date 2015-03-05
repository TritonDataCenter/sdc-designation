/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/hard-filter-volumes-from.js');

var log = {
	trace: function () { return (true); }
};

var servers = [
	{
		uuid: 'd8ea612d-7440-411e-8e34-e6bf1adeb008',
		vms: {
			'1c713cf6-8433-4a3c-b2a0-40df6b24074f': {},
			'c7deac87-5f2c-46d5-9374-c3e261ab3eb8': {}
		}
	},
	{
		uuid: '07d6d108-f4ed-4f2c-9b09-949f99de2b5d',
		vms: {
			'679c97ea-065b-4a4f-9629-3aabde21cb45': {},
			'd2872179-574c-4f86-8d0c-651a8b628e64': {}
		}
	},
	{
		uuid: '60eaf62c-f19e-4e15-b520-72830b0afe2d',
		vms: {
			'679c97ea-065b-4a4f-9629-3aabde21cb45': {},
			'0d0690a2-06a7-41cb-a0a4-55d5e37519e7': {}
		}
	},
	{
		uuid: '69cd993f-d679-4382-96e0-f6821a4ce36b',
		vms: {}
	}
];

exports.filterVolumesFrom = function (t)
{
	var vm = {
		docker: true, // just something non-null for this test
		internal_metadata: {
			'docker:volumesfrom': [
				'679c97ea-065b-4a4f-9629-3aabde21cb45',
				'0d0690a2-06a7-41cb-a0a4-55d5e37519e7'
			]
		}
	};

	var state = {};

	var results = filter.run(log, state, servers, { vm: vm });
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, [servers[2]]);
	t.deepEqual(state, {});

	var expectedReasons = {
		/* BEGIN JSSTYLED */
		'd8ea612d-7440-411e-8e34-e6bf1adeb008': 'VM needs volumes from 679c97ea-065b-4a4f-9629-3aabde21cb45, which was not found on server',
		'07d6d108-f4ed-4f2c-9b09-949f99de2b5d': 'VM needs volumes from 0d0690a2-06a7-41cb-a0a4-55d5e37519e7, which was not found on server',
		'69cd993f-d679-4382-96e0-f6821a4ce36b': 'VM needs volumes from 679c97ea-065b-4a4f-9629-3aabde21cb45, which was not found on server'
		/* END JSSTYLED */
	};

	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.filterVolumesFrom_with_no_servers = function (t)
{
	var vm = {
		docker: true, // just something non-null for this test
		internal_metadata: {
			'docker:volumesfrom': [
				'679c97ea-065b-4a4f-9629-3aabde21cb45',
				'0d0690a2-06a7-41cb-a0a4-55d5e37519e7'
			]
		}
	};

	var state = {};

	var results = filter.run(log, state, [], { vm: vm });
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, []);
	t.deepEqual(reasons, {});
	t.deepEqual(state, {});

	t.done();
};

exports.filterVolumesFrom_with_no_metadata = function (t)
{
	var vm = {
		docker: true // just something non-null for this test
	};

	var state = {};

	var results = filter.run(log, state, servers, { vm: vm });
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, servers);
	t.deepEqual(reasons, {});
	t.deepEqual(state, {});

	t.done();
};

exports.filterVolumesFrom_with_no_volumesfrom = function (t)
{
	var vm = {
		docker: true, // just something non-null for this test
		internal_metadata: {}
	};

	var state = {};

	var results = filter.run(log, state, servers, { vm: vm });
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, servers);
	t.deepEqual(reasons, {});
	t.deepEqual(state, {});

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
