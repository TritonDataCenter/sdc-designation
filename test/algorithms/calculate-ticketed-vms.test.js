/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/calculate-ticketed-vms.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var GiB = 1024 * 1024 * 1024;

var serversInfo = [ {
	uuid: '7f9b1a24-dd28-430e-92ed-604fed51772b',
	disk_kvm_zvol_volsize_bytes: 25 * GiB,
	disk_zone_quota_bytes: 5 * GiB,
	vms: {
		'1ac434da-01aa-4663-8420-d3524ed1de0c': {
			uuid: '1ac434da-01aa-4663-8420-d3524ed1de0c',
			brand: 'kvm',
			cpu_cap: 350,
			quota: 25,
			max_physical_memory: 2048,
			owner_uuid: 'a2617217-fb90-4b45-ad62-7ca163258173',
			zone_state: 'running',
			state: 'running'
		},
		'b3d04682-536f-4f09-8170-1954e45e9e1c': {
			uuid: 'b3d04682-536f-4f09-8170-1954e45e9e1c',
			brand: 'joyent',
			cpu_cap: 350,
			quota: 5,
			max_physical_memory: 128,
			owner_uuid: 'a2617217-fb90-4b45-ad62-7ca163258173',
			zone_state: 'running',
			state: 'running'
		}
	}
}, {
	uuid: '38a07663-4ca2-4f95-bdcb-5d84f078626d',
	disk_kvm_zvol_volsize_bytes: 10 * GiB,
	disk_zone_quota_bytes: 20 * GiB,
	vms: {
		'62559b33-4f3a-4505-a942-87cc557fdf4e': {
			uuid: '62559b33-4f3a-4505-a942-87cc557fdf4e',
			brand: 'joyent',
			cpu_cap: 350,
			quota: 20,
			max_physical_memory: 512,
			owner_uuid: 'a2617217-fb90-4b45-ad62-7ca163258173',
			zone_state: 'running',
			state: 'running'
		},
		'335498f7-a1ed-420c-8367-7f2769ca1e84': {
			uuid: '335498f7-a1ed-420c-8367-7f2769ca1e84',
			brand: 'kvm',
			cpu_cap: 350,
			quota: 10,
			max_physical_memory: 4096,
			owner_uuid: 'a2617217-fb90-4b45-ad62-7ca163258173',
			zone_state: 'running',
			state: 'running'
		}
	}
}, {
	uuid: '67e48c2e-45bb-400a-bc7d-3143894aacfa',
	disk_kvm_zvol_volsize_bytes: 0,
	disk_zone_quota_bytes: 0,
	vms: {}
}, {
	uuid: '0c104a5b-1844-4205-821b-f0c989ccf6e7',
	disk_kvm_zvol_volsize_bytes: 0,
	disk_zone_quota_bytes: 0
} ];

var tickets = [ {
	// this should be skipped, since it's finished
	uuid: '2fffa3a4-1dd9-4eab-a324-b49854b169e9',
	server_uuid: '67e48c2e-45bb-400a-bc7d-3143894aacfa',
	scope: 'vm',
	id: 'bb665d63-7b69-4403-bed7-34540adf4299',
	expires_at: '2014-12-10T07:03:19.207Z',
	created_at: '2014-12-10T06:53:19.217Z',
	updated_at: '2014-12-10T06:53:45.306Z',
	status: 'finished',
	action: 'provision',
	extra: {
		workflow_job_uuid: '63671397-0a24-4eb0-8ded-abb473264647',
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		max_physical_memory: 1024,
		cpu_cap: 100,
		quota: 25,
		brand: 'smartos'
	}
}, {
	// should be skipped, since it has different action
	uuid: '6b477f05-5671-46f9-8db0-958b4563c2ed',
	server_uuid: '67e48c2e-45bb-400a-bc7d-3143894aacfa',
	scope: 'vm',
	id: '470389cf-3b65-4c1f-b218-e6657f23ddbb',
	expires_at: '2014-12-10T07:03:19.207Z',
	created_at: '2014-12-10T06:53:19.217Z',
	updated_at: '2014-12-10T06:53:45.306Z',
	status: 'queued',
	action: 'stop',
	extra: {
		// stop action doesn't have these, but keep for testing
		workflow_job_uuid: '3f207f33-acb5-4bae-84b3-52fa30e2249b',
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		max_physical_memory: 256,
		cpu_cap: 150,
		quota: 20,
		brand: 'smartos'
	}
}, {
	// should be skipped, since the VM is already in server object above
	uuid: '6b477f05-5671-46f9-8db0-958b4563c2ed',
	server_uuid: '38a07663-4ca2-4f95-bdcb-5d84f078626d',
	scope: 'vm',
	id: '62559b33-4f3a-4505-a942-87cc557fdf4e',
	expires_at: '2014-12-10T07:03:19.207Z',
	created_at: '2014-12-10T06:53:19.217Z',
	updated_at: '2014-12-10T06:53:45.306Z',
	status: 'queued',
	action: 'provision',
	extra: {
		workflow_job_uuid: 'd1962667-ccb0-4f7b-88d9-3fd9ea8ed39e',
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		max_physical_memory: 512,
		cpu_cap: 250,
		quota: 10,
		brand: 'smartos'
	}
}, {
	// Should be skipped, since the ticket has no 'extra' attribute.
	// Note this should also eliminate the server from results.
	uuid: '64a77667-14cf-4e88-8b6c-090451852c6f',
	server_uuid: '38a07663-4ca2-4f95-bdcb-5d84f078626d',
	scope: 'vm',
	id: '83460993-a9db-4403-ab78-d6d4b5f04303',
	expires_at: '2014-12-10T07:03:19.207Z',
	created_at: '2014-12-10T06:53:19.217Z',
	updated_at: '2014-12-10T06:53:45.306Z',
	status: 'active',
	action: 'provision'
}, {
	// should work
	uuid: 'd6af4e08-9599-4588-9288-53a08eb281ac',
	server_uuid: '67e48c2e-45bb-400a-bc7d-3143894aacfa',
	scope: 'vm',
	id: '8e54da2f-996f-491c-92ff-1b1d6c48f314',
	expires_at: '2014-12-10T07:03:19.207Z',
	created_at: '2014-12-10T06:53:19.217Z',
	updated_at: '2014-12-10T06:53:45.306Z',
	status: 'queued',
	action: 'provision',
	extra: {
		workflow_job_uuid: 'c19685bc-1642-412d-b9df-bd2fc61ad5d6',
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		max_physical_memory: 768,
		cpu_cap: 150,
		quota: 10,
		brand: 'smartos'
	}
}, {
	// should work
	uuid: '587fa7df-b59f-4a62-9647-655a32efa6af',
	server_uuid: '0c104a5b-1844-4205-821b-f0c989ccf6e7',
	scope: 'vm',
	id: 'cbd5b6b3-861d-44d1-a2b7-65ea39ada45a',
	expires_at: '2014-12-10T07:03:19.207Z',
	created_at: '2014-12-10T06:53:19.217Z',
	updated_at: '2014-12-10T06:53:45.306Z',
	status: 'active',
	action: 'provision',
	extra: {
		workflow_job_uuid: '80134d82-352e-4b88-b298-b2138505b29c',
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		max_physical_memory: 2048,
		cpu_cap: 600,
		quota: 10,
		brand: 'kvm',
		disks: [ {
			image_uuid: 'd8d81aee-20cf-11e5-8503-2bc101a1d577',
			image_name: 'debian-7',
			image_size: 10240
		}, {
			size: 25600,
			refreservation: 25600
		} ]
	}
} ];

test('calculate ticketed VMs', function (t) {
	var state = {};
	var constraints = { tickets: tickets };
	var results = filter.run(log, state, serversInfo, constraints);
	var servers = results[0];
	var reasons = results[1];
	t.deepEqual(state, {});
	// t.deepEqual(servers, serversInfo);
	t.deepEqual(reasons, undefined);

	t.deepEqual(servers[0], serversInfo[0]);

	var server = servers[1];
	delete server.vms['8e54da2f-996f-491c-92ff-1b1d6c48f314'].last_modified;
	t.deepEqual(server, {
		uuid: '67e48c2e-45bb-400a-bc7d-3143894aacfa',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 10 * GiB,
		vms: {
			'8e54da2f-996f-491c-92ff-1b1d6c48f314': {
				uuid: '8e54da2f-996f-491c-92ff-1b1d6c48f314',
				owner_uuid: '930896af-bf8c-48d4-885c-' +
					'6573a94b1853',
				max_physical_memory: 768,
				cpu_cap: 150,
				quota: 10,
				brand: 'smartos',
				zone_state: 'running',
				state: 'running'
			}
		}
	});

	server = servers[2];
	delete server.vms['cbd5b6b3-861d-44d1-a2b7-65ea39ada45a'].last_modified;
	t.deepEqual(server, {
		uuid: '0c104a5b-1844-4205-821b-f0c989ccf6e7',
		disk_kvm_zvol_volsize_bytes: 25 * GiB,
		disk_zone_quota_bytes: 10 * GiB, // for root kvm dataset
		vms: {
			'cbd5b6b3-861d-44d1-a2b7-65ea39ada45a': {
				uuid: 'cbd5b6b3-861d-44d1-a2b7-65ea39ada45a',
				owner_uuid: '930896af-bf8c-48d4-885c-' +
					'6573a94b1853',
				max_physical_memory: 3072,
				cpu_cap: 600,
				quota: 10,
				brand: 'kvm',
				zone_state: 'running',
				state: 'running'
			}
		}
	});

	t.end();
});

test('calculate ticketed VMs with no servers', function (t) {
	var state = {};
	var constraints = { tickets: tickets };

	var results = filter.run(log, state, [], constraints);
	var servers = results[0];
	var reasons = results[1];

	t.deepEqual(servers, []);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});

test('calculate ticketed VMs with no tickets', function (t) {
	var state = {};
	var constraints = { tickets: [] };

	var results = filter.run(log, state, serversInfo, constraints);
	var servers = results[0];
	var reasons = results[1];

	t.deepEqual(servers, serversInfo);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
});

test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
