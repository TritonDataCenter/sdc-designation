/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

var test = require('tape');
var Allocator = require('../lib/allocator.js');
var common = require('./common');


var log = {
	trace: function () {},
	debug: function () {},
	info:  function () {},
	warn:  function () {},
	error: function () {}
};

var SERVERS = common.getExampleServers();
SERVERS[0].traits = {
	cabbages: true
};

var IMG = {
	uuid: '80072e7c-8e53-44d0-8755-2cbef6151c03',
	owner: '2f6eb9a9-c451-4fc5-a6eb-18b51b915280',
	name: 'foobar64',
	version: '0.0.1',
	state: 'active',
	disabled: false,
	public: true,
	published_at: '2014-11-17T18:06:00Z',
	type: 'zone-dataset',
	os: 'smartos',
	files: [ {
		sha1: '01b9d080-0ffb-4470-8311-915d26646590',
		size: 110958470,
		compression: 'gzip'
	} ],
	description: 'So many packages, so little time.',
	homepage: 'https://docs.joyent.com/images/smartos/foobar',
	urn: 'sdc:sdc:foobar:0.0.1',
	requirements: {
		networks: [ {
			name: 'net0',
			description: 'public'
		} ]
	},
	v: 2
};

var PKG = {
	name: 'foobarbaz',
	version: '1.0.0',
	active: true,
	vcpus: 2,
	cpu_cap: 200,
	description: 'I am the very model of a modern Joyent package',
	max_lwps: 4000,
	max_physical_memory: 1024,
	max_swap: 2048,
	quota: 10240,
	zfs_io_priority: 100,
	uuid: '84a7a8ea-29b5-47af-9bf4-148c2a11368c',
	created_at: '2015-03-03T16:57:04.008Z',
	updated_at: '2015-03-04T11:43:33.267Z',
	traits: {
		cabbages: true
	},
	overprovision_ram: 1,
	overprovision_disk: 1,
	overprovision_cpu: 4,
	group: '',
	v: 1
};

var VM = {
	vm_uuid: '6c5ac296-ff76-4581-8d39-4b3c35484082',
	owner_uuid: 'b4f66289-c30f-4d29-9645-21f8f939bcb2',
	ram: 1024,
	cpu_cap: 200,
	max_lwps: 4000,
	max_swap: 2048,
	quota: 10,
	zfs_io_priority: 100,
	locality: {
		near: '736ddef6-8854-4dd5-82a0-2d184bd90cd4',
		far: [
			'ae9f609c-25b6-47fb-b429-e7e341a7875f',
			'a579ec4d-659f-4f64-89b8-2e9f7130da05'
		]
	}
};

var TICKETS = [
	{
		uuid: '4de2031d-2a49-4895-a2a1-d04af8eecd63',
		server_uuid: '00000000-0000-0000-0000-00259094373c',
		scope: 'vm',
		action: 'provision',
		id: 'cf534f80-618a-4a8a-b5dc-485aa622a0ba',
		expires_at: '2015-10-10T00:00:00.000Z',
		created_at: '2015-06-27T19:36:47.708Z',
		updated_at: '2015-06-27T19:36:47.708Z',
		status: 'active',
		extra: {
			owner_uuid: '0ddc0513-f414-4ee5-81cc-7b716fd04a6a',
			max_physical_memory: 1024,
			cpu_cap: 2000,
			quota: 10240,
			brand: 'smartos'
		}
	}
];

function newAllocator(cb)
{
	var allocator = new Allocator(log);

	(function waitTilLoaded() {
		if (!allocator.serverCapacityExpr)
			return (setTimeout(waitTilLoaded, 250));

		return (cb(allocator));
	})();
}


test('allocate 1', function (t) {
	var expectedSteps = [
		{
			step: 'Received by DAPI',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4',
				'asdsa'
			]
		}, {
			step: 'Servers which have been setup',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4',
				'asdsa'
			]
		}, {
			step: 'Servers which are currently running',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			],
			reasons: {
				asdsa: 'Server has status: undefined'
			}
		}, {
			step: 'Servers objects which are valid',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			/* JSSTYLED */
			step: 'Servers containing VMs required for volumes-from',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Add VMs which have open provisioning tickets',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Calculate localities of owner\'s VMs',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers which are not reserved',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers which are not headnodes',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with more VMs than limit',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers supporting required VLANs',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			/* JSSTYLED */
			step: 'Servers which meet image manifest platform requirements',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with correct traits',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ],
			reasons: {
				/* JSSTYLED */
				'00000000-0000-0000-0000-0025909437d4': 'Combined vm/pkg/img traits require {"cabbages":true} but server has {}'
			}
		}, {
			/* JSSTYLED */
			step: 'Servers that had consecutive failed provisions recently',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Add VMs which have been allocated to recently',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Calculate unreserved resources on each server',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			/* JSSTYLED */
			step: 'Servers with same overprovision ratios as requested VM',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Servers with enough unreserved RAM',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Servers with enough unreserved disk',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Servers with enough unreserved CPU',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Servers which are not in the reservoir',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Filter out the largest and most empty servers',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Servers with requested locality considered',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Sort servers by minimum unreserved RAM',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Sort servers by maximum unreserved RAM',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			/* JSSTYLED */
			step: 'Sort servers by minimum zones belonging to owner',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Sort servers randomly',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}, {
			step: 'Random weighted server',
			remaining: [ '00000000-0000-0000-0000-00259094373c' ]
		}
	];

	newAllocator(function (allocator) {
		var res = allocator.allocate(SERVERS, VM, IMG, PKG, TICKETS);
		var server = res[0];
		var steps  = res[1];

		t.equal(server.uuid, '00000000-0000-0000-0000-00259094373c');
		t.deepEqual(steps, expectedSteps);

		t.end();
	});
});


test('allocate 2', function (t) {
	var expectedSteps = [
		{
			step: 'Received by DAPI',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4',
				'asdsa'
			]
		}, {
			step: 'Servers which have been setup',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4',
				'asdsa'
			]
		}, {
			step: 'Servers which are currently running',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			],
			reasons: {
				asdsa: 'Server has status: undefined'
			}
		}, {
			step: 'Servers objects which are valid',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			/* JSSTYLED */
			step: 'Servers containing VMs required for volumes-from',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Add VMs which have open provisioning tickets',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Calculate localities of owner\'s VMs',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers which are not reserved',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers which are not headnodes',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with more VMs than limit',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers supporting required VLANs',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			/* JSSTYLED */
			step: 'Servers which meet image manifest platform requirements',
			remaining: [
				'00000000-0000-0000-0000-00259094373c',
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with correct traits',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			],
			reasons: {
				/* JSSTYLED */
				'00000000-0000-0000-0000-00259094373c': 'Combined vm/pkg/img require no traits but server has {"cabbages":true}'
			}
		}, {
			/* JSSTYLED */
			step: 'Servers that had consecutive failed provisions recently',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Add VMs which have been allocated to recently',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Calculate unreserved resources on each server',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			/* JSSTYLED */
			step: 'Servers with same overprovision ratios as requested VM',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with enough unreserved RAM',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with enough unreserved disk',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with enough unreserved CPU',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers which are not in the reservoir',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Filter out the largest and most empty servers',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Servers with requested locality considered',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Sort servers by minimum unreserved RAM',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Sort servers by maximum unreserved RAM',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			/* JSSTYLED */
			step: 'Sort servers by minimum zones belonging to owner',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Sort servers randomly',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}, {
			step: 'Random weighted server',
			remaining: [
				'00000000-0000-0000-0000-0025909437d4'
			]
		}
	];

	newAllocator(function (allocator) {
		var res = allocator.allocate(SERVERS, VM, IMG, null, TICKETS);
		var server = res[0];
		var steps  = res[1];

		t.equal(server.uuid, '00000000-0000-0000-0000-0025909437d4');
		t.deepEqual(steps, expectedSteps);

		t.end();
	});
});