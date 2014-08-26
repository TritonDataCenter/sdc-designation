/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/hard-filter-vlans.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var servers = [
	{
		uuid: '564d9386-8c67-b674-587f-101f1db2eda7',
		sysinfo: {
			'Network Interfaces': {
				e1000g0: {
					'Link Status': 'up',
					'NIC Names': [ 'external' ]
				},
				e1000g1: {
					'Link Status': 'up',
					'NIC Names': [ 'admin' ]
				}
			}
		}
	},
	{
		uuid: 'f5e4e5f9-75e6-43e8-a016-a85835b377e1',
		sysinfo: {
			'Network Interfaces': {
				e1000g0: {
					'Link Status': 'down',
					'NIC Names': [ 'external' ]
				},
				e1000g1: {
					'Link Status': 'up',
					'NIC Names': [ 'admin' ]
				}
			}
		}
	},
	{
		uuid: '97b466d7-465d-4c22-b26e-a6707a22390e',
		sysinfo: {
			'Network Interfaces': {
				e1000g0: {
					'Link Status': 'up',
					'NIC Names':
					    [ 'external', 'customer12' ]
				},
				e1000g1: {
					'Link Status': 'up',
					'NIC Names': [ 'admin' ]
				}
			}
		}
	}
];

function
test(t, vlans, expectedUuids, expectedReasons)
{
	var state = {};
	var constraints = { vm: { nic_tags: vlans } };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	var serverUuids = filteredServers.map(function (s) { return s.uuid; });

	t.deepEqual(serverUuids.sort(), expectedUuids);
	t.deepEqual(state, {});
	t.deepEqual(reasons, expectedReasons);
}

exports.filterVlans_on_single_vlan = function (t)
{
	var expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
	    '97b466d7-465d-4c22-b26e-a6707a22390e' ];
	var expectedReasons = { 'f5e4e5f9-75e6-43e8-a016-a85835b377e1':
	    'NIC e1000g0 for tag "external" is down'};
	test(t, ['external'], expectedUuids, expectedReasons);

	expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
	    '97b466d7-465d-4c22-b26e-a6707a22390e',
	    'f5e4e5f9-75e6-43e8-a016-a85835b377e1' ];
	expectedReasons = {};
	test(t, ['admin'], expectedUuids, expectedReasons);

	expectedUuids = [ '97b466d7-465d-4c22-b26e-a6707a22390e' ];
	expectedReasons = {
		'564d9386-8c67-b674-587f-101f1db2eda7':
		    'Server missing vlan "customer12"',
		'f5e4e5f9-75e6-43e8-a016-a85835b377e1':
		    'Server missing vlan "customer12"'
	};
	test(t, ['customer12'], expectedUuids, expectedReasons);

	expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
	    '97b466d7-465d-4c22-b26e-a6707a22390e',
	    'f5e4e5f9-75e6-43e8-a016-a85835b377e1' ];
	expectedReasons = {};
	test(t, [], expectedUuids, expectedReasons);

	expectedReasons = {
		'564d9386-8c67-b674-587f-101f1db2eda7':
		    'Server missing vlan "doesnotexist"',
		'f5e4e5f9-75e6-43e8-a016-a85835b377e1':
		    'Server missing vlan "doesnotexist"',
		'97b466d7-465d-4c22-b26e-a6707a22390e':
		    'Server missing vlan "doesnotexist"' };
	test(t, ['doesnotexist'], [], expectedReasons);

	t.done();
};

exports.filterVlans_on_multiple_vlans = function (t)
{
	var expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
	    '97b466d7-465d-4c22-b26e-a6707a22390e' ];
	var expectedReasons = { 'f5e4e5f9-75e6-43e8-a016-a85835b377e1':
	    'NIC e1000g0 for tag "external" is down' };
	test(t, ['external', 'admin'], expectedUuids, expectedReasons);
	test(t, ['admin', 'external'], expectedUuids, expectedReasons);

	expectedUuids = [ '97b466d7-465d-4c22-b26e-a6707a22390e' ];
	expectedReasons = {
		'564d9386-8c67-b674-587f-101f1db2eda7':
		    'Server missing vlan "customer12"',
		'f5e4e5f9-75e6-43e8-a016-a85835b377e1':
		    'Server missing vlan "customer12"' };
	test(t, ['customer12', 'admin', 'external'], expectedUuids,
	    expectedReasons);

	expectedReasons = {
		'564d9386-8c67-b674-587f-101f1db2eda7':
		    'Server missing vlan "doesnotexist"',
		'f5e4e5f9-75e6-43e8-a016-a85835b377e1':
		    'Server missing vlan "doesnotexist"',
		'97b466d7-465d-4c22-b26e-a6707a22390e':
		    'Server missing vlan "doesnotexist"' };
	test(t, ['admin', 'doesnotexist'], [], expectedReasons);

	t.done();
};

exports.filterVlans_with_no_servers = function (t)
{
	var state = {};
	var emptyServers = [];
	var constraints = { vm: { nic_tags: ['admin'] } };

	var results = filter.run(log, state, emptyServers, constraints);
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
