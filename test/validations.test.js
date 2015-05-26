/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

var test = require('tape');
var validations = require('../lib/validations.js');


var SERVER = {
	sysinfo: {
		'Live Image': '20150124T202823Z',
		'System Type': 'SunOS',
		'Boot Time': '1396549199',
		'Datacenter Name': 'frobbit',
		'SDC Version': '7.1',
		'Manufacturer': 'Joyent',
		'Product': 'Joyent-Compute-Platform',
		'Serial Number': 'S12123123109702',
		'SKU Number': '600-0002-01 rev 01',
		'HW Version': '0123456789',
		'HW Family': 'JCP-1100',
		'Setup': 'true',
		'VM Capable': true,
		'CPU Type': 'Intel(R) Xeon(R) CPU E5-2670 0 @ 2.60GHz',
		'CPU Virtualization': 'vmx',
		'CPU Physical Cores': 2,
		'UUID': 'c0100000-0000-0000-ab1c-002520ca42b7',
		'Hostname': 'server0001',
		'CPU Total Cores': 32,
		'MiB of Memory': '262110',
		'Zpool': 'zones',
		'Zpool Profile': 'mirror',
		'Zpool Creation': 1384455157,
		'Zpool Size in GiB': 3831,
		'Boot Parameters': {},
		'SDC Agents': [],
		'Network Interfaces': {
			'ixgbe0': {
				'MAC Address': '91:e3:ca:30:b2:33',
				'ip4addr': '',
				'Link Status': 'up',
				'NIC Names': ['internal', 'external']
			},
			'ixgbe1': {
				'MAC Address': '90:e2:ba:39:b9:29',
				'ip4addr': '',
				'Link Status': 'down',
				'NIC Names': []
			}
	        },
		'Virtual Network Interfaces': {},
		'Link Aggregations': {}
	},
	ram: 262110,
	current_platform: '20150124T202823Z',
	headnode: false,
	boot_platform: '20150124T202823Z',
	datacenter: 'frobbit',
	overprovision_ratio: 1,
	reservation_ratio: 0.13,
	reservoir: false,
	traits: {},
	rack_identifier: 'some-rack',
	comments: '',
	uuid: 'c0100000-0000-0000-ab1c-002520ca42b7',
	hostname: 'server0001',
	reserved: false,
	boot_params: {},
	kernel_flags: {},
	default_console: 'vga',
	serial: 'ttyb',
	setup: true,
	setting_up: false,
	last_boot: '2015-02-03T18:19:59.000Z',
	created: '2014-11-14T18:52:37.000Z',
	vms: {
		'89f99b54-bb30-4a43-b6f9-ec5c3279f98d': {
			uuid: '89f99b54-bb30-4a43-b6f9-ec5c3279f98d',
			/* JSSTYLED */
			owner_uuid: '069a9150-ee34-4f93-a648-3ddfe6379dc6',
			quota: 120,
			max_physical_memory: 4096,
			zone_state: 'running',
			state: 'running',
			brand: 'joyent',
			cpu_cap: 800,
			last_modified: '2014-05-15T17:33:29.000Z'
		}
	},
	transitional_status: '',
	last_heartbeat: '2015-03-10T14:44:19.848Z',
	status: 'running',
	memory_available_bytes: 200280608768,
	memory_arc_bytes: 32576769224,
	memory_total_bytes: 274832932864,
	memory_provisionable_bytes: 188378460979,
	disk_kvm_zvol_used_bytes: 19004297216,
	disk_kvm_zvol_volsize_bytes: 526133493760,
	disk_kvm_quota_bytes: 10737418240,
	disk_zone_quota_bytes: 2154999840768,
	disk_cores_quota_bytes: 335007449088,
	disk_installed_images_used_bytes: 22598883328,
	disk_pool_size_bytes: 4179003179008,
	overprovision_ratios: { ram: 1 },
	unreserved_cpu: 3200,
	unreserved_ram: 179643,
	unreserved_disk: 3963856
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
	default: false,
	group: '',
	v: 1
};

var TICKET = {
	uuid: '4de2031d-2a49-4895-a2a1-d04af8eecd63',
	server_uuid: 'd5d6da5c-db47-43df-83e2-d8ada9e7f7c0',
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
};

function deepCopy(obj)
{
	return (JSON.parse(JSON.stringify(obj)));
}


test('validate traits', function (t) {
	var validTraits = [
		{},
		{ 'cabbages': true },
		{ 'foo': [ 'bar', 'baz' ], 'quux': false }
	];


	validTraits.forEach(function (traits) {
		var res = validations.validateTraits(traits);
		t.ifError(res);
	});

// TODO: joyent-schema's handling of regex is currently broken
//	var badTraits = deepCopy(validTraits[2]);
//	badTraits.foo = [ 1, 2 ];
//	var res2 = validations.validateTraits(badTraits);
//	t.ok(res2);

	t.end();
});


test('validate platform limits', function (t) {
	var validLimits = [
		{},
		{ min_platform: {} },
		{
			min_platform: {
				'6.5': '20120901T113025Z',
				'7.1': '20130308T102805Z'
			}
		}
	];

	var tag = 'min_platform';
	validLimits.forEach(function (limits) {
		var res = validations.validatePlatformLimits(limits, tag);
		t.ifError(res);
	});

	var prefix = 'foobar';
	var limits2 = { foobar: validLimits[1] };
	var res2 = validations.validatePlatformLimits(limits2, tag, prefix);
	t.ifError(res2);

	var badLimits = deepCopy(validLimits[2]);
	badLimits.min_platform['7.00'] = '20120901T113025Z';
	res2 = validations.validatePlatformLimits(badLimits, tag);
	t.ok(res2);

	t.end();
});


test('validate locality', function (t) {
	var validLocalities = [
		{},
		{ far: 'c85e0079-fe94-461e-8b1f-9a6d7c0d9b5c' },
		{
			near: '0c6d54ea-05f9-49a7-a35b-e2dd901afd78',
			far: [
				'c85e0079-fe94-461e-8b1f-9a6d7c0d9b5c',
				'a579ec4d-659f-4f64-89b8-2e9f7130da05'
			]
		}
	];

	validLocalities.forEach(function (locality) {
		var res = validations.validateLocality(locality);
		t.ifError(res);
	});

	var badLocality = deepCopy(validLocalities[1]);
	badLocality.far = 'foo';
	var res2 = validations.validateLocality(badLocality);
	t.ok(res2);

	t.end();
});


test('validate vm', function (t) {
	var validVms = [
		{
			vm_uuid: '6c5ac296-ff76-4581-8d39-4b3c35484082',
			owner_uuid: 'b4f66289-c30f-4d29-9645-21f8f939bcb2',
			ram: 1024
		},
		{
			vm_uuid: '6c5ac296-ff76-4581-8d39-4b3c35484082',
			owner_uuid: 'b4f66289-c30f-4d29-9645-21f8f939bcb2',
			ram: 1024,
			quota: 10,
			cpu_cap: 200,
			locality: {
				near: '0c6d54ea-05f9-49a7-a35b-e2dd901afd78',
				far: [
					'c85e0079-fe94-461e-8b1f-9a6d7c0d9b5c',
					'a579ec4d-659f-4f64-89b8-2e9f7130da05'
				]
			},
			traits: {
				foo: [ 'bar', 'baz' ],
				quux: false
			},
			nic_tags: [ 'foo', 'bar' ]
		}
	];

	validVms.forEach(function (vm) {
		var res = validations.validateVmPayload(vm);
		t.ifError(res);
	});

	t.end();
});


test('validate VM payload', function (t) {
	var validVms = [
		{
			vm_uuid: '6c5ac296-ff76-4581-8d39-4b3c35484082',
			owner_uuid: 'b4f66289-c30f-4d29-9645-21f8f939bcb2',
			ram: 1024
		},
		{
			vm_uuid: '6c5ac296-ff76-4581-8d39-4b3c35484082',
			owner_uuid: 'b4f66289-c30f-4d29-9645-21f8f939bcb2',
			ram: 1024,
			quota: 10,
			cpu_cap: 200,
			locality: {
				near: '0c6d54ea-05f9-49a7-a35b-e2dd901afd78',
				far: [
					'c85e0079-fe94-461e-8b1f-9a6d7c0d9b5c',
					'a579ec4d-659f-4f64-89b8-2e9f7130da05'
				]
			},
			traits: {
				foo: [ 'bar', 'baz' ],
				quux: false
			},
			nic_tags: [ 'foo', 'bar' ],
			internal_metadata: {
				'docker:volumesfrom': '[]'
			}
		}
	];

	validVms.forEach(function (vm) {
		var res = validations.validateVmPayload(vm);
		t.ifError(res);
	});

	var requirements = { min_ram: 768 };
	var res2 = validations.validateVmPayload(validVms[0], requirements);
	t.ifError(res2);

	requirements = { min_ram: 2048 };
	res2 = validations.validateVmPayload(validVms[0], requirements);
	t.ok(res2);

	requirements = { max_ram: 768 };
	res2 = validations.validateVmPayload(validVms[0], requirements);
	t.ok(res2);

	requirements = { max_ram: 2048 };
	res2 = validations.validateVmPayload(validVms[0], requirements);
	t.ifError(res2);

	var badPayload = deepCopy(validVms[1]);
	badPayload.internal_metadata['docker:volumesfrom'] = '{}';
	res2 = validations.validateVmPayload(badPayload);
	t.ok(res2);

	t.end();
});


test('validate server', function (t) {
	var res = validations.validateServer(SERVER);
	t.ifError(res);

	var badServer = deepCopy(SERVER);
	badServer.sysinfo = {};
	res = validations.validateServer(badServer);
	t.ok(res);

	t.end();
});


test('validate servers', function (t) {
	var res = validations.validateServers([SERVER]);
	t.ifError(res);

	res = validations.validateServers([]);
	t.ok(res);

	t.end();
});


test('validate image', function (t) {
	var res = validations.validateImage(IMG);
	t.ifError(res);

	var badImg = deepCopy(IMG);
	badImg.image_size = 'foo';
	res = validations.validateImages(badImg);
	t.ok(res);

	t.end();
});


test('validate images', function (t) {
	var res = validations.validateImages([IMG]);
	t.ifError(res);

	var badImg = deepCopy(IMG);
	badImg.image_size = 'foo';
	res = validations.validateImages([badImg]);
	t.ok(res);

	t.end();
});


test('validate package', function (t) {
	var res = validations.validatePackage(PKG);
	t.ifError(res);

	var badPkg = deepCopy(PKG);
	badPkg.traits = 42;
	res = validations.validatePackage(badPkg);
	t.ok(res);

	t.end();
});


test('validate packages', function (t) {
	var res = validations.validatePackages([PKG]);
	t.ifError(res);

	var badPkg = deepCopy(PKG);
	badPkg.traits = 42;
	res = validations.validatePackages([badPkg]);
	t.ok(res);

	t.end();
});


test('validate ticket', function (t) {
	var res = validations.validateTicket(TICKET);
	t.ifError(res);

	var badTicket = deepCopy(TICKET);
	badTicket.id = 'foo';
	res = validations.validateTicket(badTicket);
	t.ok(res);

	t.end();
});


test('validate tickets', function (t) {
	var res = validations.validateTickets([TICKET]);
	t.ifError(res);

	var badTicket = deepCopy(TICKET);
	badTicket.id = 'foo';
	res = validations.validateTicket([badTicket]);
	t.ok(res);

	t.end();
});