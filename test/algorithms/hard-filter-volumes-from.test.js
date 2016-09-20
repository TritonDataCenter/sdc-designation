/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-volumes-from.js');
var common = require('./common.js');


var LOG = {
	trace: function () { return (true); }
};

var SERVERS = [
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


var checkFilter = common.createPluginChecker(filter, LOG);


test('filterVolumesFrom()', function (t) {
	var vm = {
		docker: true, // just something non-null for this test
		internal_metadata: {
			'docker:volumesfrom': [
				'679c97ea-065b-4a4f-9629-3aabde21cb45',
				'0d0690a2-06a7-41cb-a0a4-55d5e37519e7'
			]
		}
	};

	var expectServers = [ SERVERS[2] ];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'd8ea612d-7440-411e-8e34-e6bf1adeb008': 'VM needs volumes from 679c97ea-065b-4a4f-9629-3aabde21cb45, which was not found on server',
		'07d6d108-f4ed-4f2c-9b09-949f99de2b5d': 'VM needs volumes from 0d0690a2-06a7-41cb-a0a4-55d5e37519e7, which was not found on server',
		'69cd993f-d679-4382-96e0-f6821a4ce36b': 'VM needs volumes from 679c97ea-065b-4a4f-9629-3aabde21cb45, which was not found on server'
		/* END JSSTYLED */
	};

	checkFilter(t, SERVERS, { vm: vm }, expectServers, expectReasons);
});


test('filterVolumesFrom() with no servers', function (t) {
	var vm = {
		docker: true, // just something non-null for this test
		internal_metadata: {
			'docker:volumesfrom': [
				'679c97ea-065b-4a4f-9629-3aabde21cb45',
				'0d0690a2-06a7-41cb-a0a4-55d5e37519e7'
			]
		}
	};

	checkFilter(t, [], { vm: vm }, [], {});
});


test('filterVolumesFrom() with no metadata', function (t) {
	var vm = {
		docker: true // just something non-null for this test
	};

	var expectServers = SERVERS;
	var expectReasons = {};

	checkFilter(t, SERVERS, { vm: vm }, expectServers, expectReasons);
});


test('filterVolumesFrom() with no volumesfrom', function (t) {
	var vm = {
		docker: true, // just something non-null for this test
		internal_metadata: {}
	};

	var expectServers = SERVERS;
	var expectReasons = {};

	checkFilter(t, SERVERS, { vm: vm }, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
