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
		uuid: '00009386-8c67-b674-587f-101f1db2eda7',
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
		uuid: '1111e5f9-75e6-43e8-a016-a85835b377e1',
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
		uuid: '222266d7-465d-4c22-b26e-a6707a22390e',
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
	},

	// Servers on overlay networks

	{
		uuid: '3333059f-8ce2-4573-b56a-4ed2db802ea8',
		sysinfo: {
			'Network Interfaces': { },
			'Virtual Network Interfaces': {
				sdc_underlay0: {
					'Link Status': 'up',
					'Overlay Nic Tags': [ 'sdc_overlay' ]
				}
			}
		}
	},

	{
		uuid: '44448d4e-c4a6-484c-ae49-0ff5cc2e293c',
		sysinfo: {
			'Network Interfaces': { },
			'Virtual Network Interfaces': {
				e1000g0: {
					'Link Status': 'down',
					'Overlay Nic Tags': [ 'sdc_overlay' ]
				}
			}
		}
	},

	{
		uuid: '5555fa4e-144f-43e1-809f-70404573b076',
		sysinfo: {
			'Network Interfaces': {
				ixgbe0: {
					'Link Status': 'up',
					'NIC Names': [ 'customer13' ]
				}
			},
			'Virtual Network Interfaces': {
				sdc_underlay0: {
					'Link Status': 'up',
					'Overlay Nic Tags': [ 'sdc_overlay' ]
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
	var expectedUuids = [ '00009386-8c67-b674-587f-101f1db2eda7',
		'222266d7-465d-4c22-b26e-a6707a22390e' ];
	var expectedReasons = {
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'NIC e1000g0 for tag "external" is down',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "external"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "external"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "external"'
	};
	test(t, ['external'], expectedUuids, expectedReasons);

	expectedUuids = [ '00009386-8c67-b674-587f-101f1db2eda7',
		'1111e5f9-75e6-43e8-a016-a85835b377e1',
		'222266d7-465d-4c22-b26e-a6707a22390e' ];
	expectedReasons = {
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "admin"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "admin"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "admin"'
	};
	test(t, ['admin'], expectedUuids, expectedReasons);

	expectedUuids = [ '222266d7-465d-4c22-b26e-a6707a22390e' ];
	expectedReasons = {
		'00009386-8c67-b674-587f-101f1db2eda7':
			'Server missing vlan "customer12"',
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'Server missing vlan "customer12"',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "customer12"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "customer12"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "customer12"'
	};
	test(t, ['customer12'], expectedUuids, expectedReasons);

	expectedUuids = [ '00009386-8c67-b674-587f-101f1db2eda7',
		'1111e5f9-75e6-43e8-a016-a85835b377e1',
		'222266d7-465d-4c22-b26e-a6707a22390e',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c',
		'5555fa4e-144f-43e1-809f-70404573b076'
	];
	expectedReasons = {};
	test(t, [], expectedUuids, expectedReasons);

	expectedReasons = {
		'00009386-8c67-b674-587f-101f1db2eda7':
			'Server missing vlan "doesnotexist"',
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'Server missing vlan "doesnotexist"',
		'222266d7-465d-4c22-b26e-a6707a22390e':
			'Server missing vlan "doesnotexist"',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "doesnotexist"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "doesnotexist"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "doesnotexist"'
	};
	test(t, ['doesnotexist'], [], expectedReasons);

	t.done();
};

exports.filterVlans_on_multiple_vlans = function (t)
{
	var expectedUuids = [ '00009386-8c67-b674-587f-101f1db2eda7',
		'222266d7-465d-4c22-b26e-a6707a22390e' ];
	var expectedReasons = { '1111e5f9-75e6-43e8-a016-a85835b377e1':
		'NIC e1000g0 for tag "external" is down',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "external"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "external"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "external"'
	};
	test(t, ['external', 'admin'], expectedUuids, expectedReasons);

	expectedReasons = { '1111e5f9-75e6-43e8-a016-a85835b377e1':
		'NIC e1000g0 for tag "external" is down',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "admin"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "admin"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "admin"'
	};
	test(t, ['admin', 'external'], expectedUuids, expectedReasons);

	expectedUuids = [ '222266d7-465d-4c22-b26e-a6707a22390e' ];
	expectedReasons = {
		'00009386-8c67-b674-587f-101f1db2eda7':
			'Server missing vlan "customer12"',
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'Server missing vlan "customer12"',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "customer12"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "customer12"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "customer12"'
	};
	test(t, ['customer12', 'admin', 'external'], expectedUuids,
		expectedReasons);

	expectedReasons = {
		'00009386-8c67-b674-587f-101f1db2eda7':
			'Server missing vlan "doesnotexist"',
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'Server missing vlan "doesnotexist"',
		'222266d7-465d-4c22-b26e-a6707a22390e':
			'Server missing vlan "doesnotexist"',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "admin"',
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'Server missing vlan "admin"',
		'5555fa4e-144f-43e1-809f-70404573b076':
			'Server missing vlan "admin"'
	};
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

exports.filterVlans_on_single_overlay_tag = function (t)
{
	var expectedUuids = [ '3333059f-8ce2-4573-b56a-4ed2db802ea8',
		'5555fa4e-144f-43e1-809f-70404573b076' ];
	var expectedReasons = {
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'NIC e1000g0 for tag "sdc_overlay" is down',
		'00009386-8c67-b674-587f-101f1db2eda7':
			'Server missing vlan "sdc_overlay"',
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'Server missing vlan "sdc_overlay"',
		'222266d7-465d-4c22-b26e-a6707a22390e':
			'Server missing vlan "sdc_overlay"'
	};
	test(t, ['sdc_overlay'], expectedUuids, expectedReasons);

	t.done();
};

exports.filterVlans_on_overlay_tag_and_vlan = function (t)
{
	var expectedUuids = [ '5555fa4e-144f-43e1-809f-70404573b076' ];
	var expectedReasons = {
		'44448d4e-c4a6-484c-ae49-0ff5cc2e293c':
			'NIC e1000g0 for tag "sdc_overlay" is down',
		'00009386-8c67-b674-587f-101f1db2eda7':
			'Server missing vlan "sdc_overlay"',
		'1111e5f9-75e6-43e8-a016-a85835b377e1':
			'Server missing vlan "sdc_overlay"',
		'222266d7-465d-4c22-b26e-a6707a22390e':
			'Server missing vlan "sdc_overlay"',
		'3333059f-8ce2-4573-b56a-4ed2db802ea8':
			'Server missing vlan "customer13"'
	};
	test(t, ['sdc_overlay', 'customer13'], expectedUuids, expectedReasons);

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
