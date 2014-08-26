/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/calculate-recent-vms.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.addRecentVms_no_prior_vms = function (t)
{
	var state = {};
	var constraints = {};

	var givenServers = [ {
		uuid: '449a8969-233e-4f90-b71c-45a234075403',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 0,
		vms: {}
	}, {
		uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 0,
		vms: {}
	} ];

	var expectedServers = [ {
		uuid: '449a8969-233e-4f90-b71c-45a234075403',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 0,
		vms: {}
	}, {
		uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 0,
		vms: {}
	} ];

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, { recent_vms: {} });
	t.deepEqual(reasons, {});

	t.done();
};

exports.addRecentVms_some_prior_vms = function (t)
{
	var MiB = 1024 * 1024;
	var GiB = MiB * 1024;

	var now = +new Date();
	var constraints = {};
	var expectedVms;
	var expectedReasons;

	var state = { recent_vms: [
		{
			uuid: '36a33066-42a6-4fcf-acf5-3df11a6b558c',
			owner_uuid: '561a7225-2989-46ad-b29e-8a900b8e4ba0',
			max_physical_memory: 1024, /* in MiB */
			cpu_cap: 400,
			quota: 25, /* in GiB */
			brand: 'smartos',
			state: 'running',
			server_uuid: '449a8969-233e-4f90-b71c-45a234075403',
			created_at: now,
			last_modified: new Date(now).toISOString()
		},
		{
			uuid: '2f371a89-b004-400b-a249-6099e88feefc',
			owner_uuid: '561a7225-2989-46ad-b29e-8a900b8e4ba0',
			max_physical_memory: 4196,
			cpu_cap: 400,
			quota: 100,
			brand: 'smartos',
			state: 'running',
			server_uuid: '449a8969-233e-4f90-b71c-45a234075403',
			created_at: now - 60 * 1000, /* 1m ago */
			last_modified: new Date(now - 60 * 1000).toISOString()
		},
		{
			uuid: '70671b04-0e6b-4f28-8650-c1728da4e41b',
			owner_uuid: 'ceb36d4e-adf3-46d6-b4cb-b33788b1b4c7',
			max_physical_memory: 2048,
			cpu_cap: 700,
			quota: 50,
			brand: 'kvm',
			state: 'running',
			server_uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
			created_at: now - 5 * 60 * 1000, /* 5m ago */
			last_modified:
			    new Date(now - 5 * 60 * 1000).toISOString()
		},
		{
			/* has an image_size */
			uuid: 'f2e725ec-86d0-434a-8642-b461e48cf059',
			owner_uuid: '60625acf-e68f-424f-8a73-25d90c5d9704',
			max_physical_memory: 8192,
			cpu_cap: 1200,
			quota: 500,
			brand: 'kvm',
			image_size: 100 * 1024 * 1024, /* in bytes */
			state: 'running',
			server_uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
			created_at: now - 5 * 60 * 1000, /* 5m ago */
			last_modified:
			    new Date(now - 5 * 60 * 1000).toISOString()
		},
		{
			/* expired */
			uuid: '84617ecf-3de0-4051-9007-680bd006293b',
			owner_uuid: '3b405c0f-c9cc-496f-8770-04a3bc28528a',
			max_physical_memory: 768,
			cpu_cap: 200,
			quota: 30,
			brand: 'kvm',
			state: 'running',
			server_uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
			created_at: now - 11 * 60 * 1000, /* 11m ago */
			last_modified:
			    new Date(now - 11 * 60 * 1000).toISOString()
		},
		{
			/* server is no longer present */
			uuid: 'd78b6ed4-e343-4772-a313-2d85abbf6cb2',
			owner_uuid: 'd712e46a-7db5-4561-a429-4e00f594c8e9',
			max_physical_memory: 512,
			cpu_cap: 350,
			quota: 10 * 1024,
			brand: 'smartos',
			state: 'running',
			server_uuid: '9455e445-a1b6-4966-ae4d-45062335d8a3',
			created_at: now,
			last_modified: new Date(now).toISOString()
		}
	] };

	var givenServers = [ {
		uuid: '449a8969-233e-4f90-b71c-45a234075403',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 0,
		vms: {}
	}, {
		uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: 0,
		vms: {}
	} ];

	var expectedServers = [ {
		uuid: '449a8969-233e-4f90-b71c-45a234075403',
		disk_kvm_zvol_volsize_bytes: 0,
		disk_zone_quota_bytes: (100 + 25) * GiB,
		vms: {
			'36a33066-42a6-4fcf-acf5-3df11a6b558c': {
				uuid: '36a33066-42a6-4fcf-acf5-3df11a6b558c',
				owner_uuid:
				    '561a7225-2989-46ad-b29e-8a900b8e4ba0',
				max_physical_memory: 1024,
				cpu_cap: 400,
				quota: 25,
				brand: 'smartos',
				state: 'running',
				server_uuid:
				    '449a8969-233e-4f90-b71c-45a234075403',
				created_at: now,
				last_modified: new Date(now).toISOString()
			},
			'2f371a89-b004-400b-a249-6099e88feefc' : {
				uuid: '2f371a89-b004-400b-a249-6099e88feefc',
				owner_uuid:
				    '561a7225-2989-46ad-b29e-8a900b8e4ba0',
				max_physical_memory: 4196,
				cpu_cap: 400,
				quota: 100,
				brand: 'smartos',
				state: 'running',
				server_uuid:
				    '449a8969-233e-4f90-b71c-45a234075403',
				created_at: now - 60 * 1000,
				last_modified:
				    new Date(now - 60 * 1000).toISOString()
			}
		}
	}, {
		uuid: '47e33f30-5226-4638-b376-53bc09fc72a6',
		disk_kvm_zvol_volsize_bytes: (500 + 50) * GiB + 100 * MiB,
		disk_zone_quota_bytes: 0,
		vms: {
			'70671b04-0e6b-4f28-8650-c1728da4e41b': {
				uuid: '70671b04-0e6b-4f28-8650-c1728da4e41b',
				owner_uuid:
				    'ceb36d4e-adf3-46d6-b4cb-b33788b1b4c7',
				max_physical_memory: 2048,
				cpu_cap: 700,
				quota: 50,
				brand: 'kvm',
				state: 'running',
				server_uuid:
				    '47e33f30-5226-4638-b376-53bc09fc72a6',
				created_at: now - 5 * 60 * 1000,
				last_modified:
				    new Date(now - 5 * 60 * 1000).toISOString()
			},
			'f2e725ec-86d0-434a-8642-b461e48cf059': {
				uuid: 'f2e725ec-86d0-434a-8642-b461e48cf059',
				owner_uuid:
				    '60625acf-e68f-424f-8a73-25d90c5d9704',
				max_physical_memory: 8192,
				cpu_cap: 1200,
				quota: 500,
				brand: 'kvm',
				image_size: 100 * 1024 * 1024,
				state: 'running',
				server_uuid:
				    '47e33f30-5226-4638-b376-53bc09fc72a6',
				created_at: now - 5 * 60 * 1000,
				last_modified:
				    new Date(now - 5 * 60 * 1000).toISOString()
			}
		}
	} ];

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	expectedVms = [
		'2f371a89-b004-400b-a249-6099e88feefc',
		'36a33066-42a6-4fcf-acf5-3df11a6b558c',
		'70671b04-0e6b-4f28-8650-c1728da4e41b',
		'd78b6ed4-e343-4772-a313-2d85abbf6cb2',
		'f2e725ec-86d0-434a-8642-b461e48cf059'
	];

	t.deepEqual(filteredServers, expectedServers);
	/* one VM was removed since it expired */
	t.deepEqual(state.recent_vms.map(function (v) {
		return (v.uuid);
	}).sort(), expectedVms);

	expectedReasons = {
		'449a8969-233e-4f90-b71c-45a234075403':
		    'Adding VM 36a33066-42a6-4fcf-acf5-3df11a6b558c. ' +
		    'Adding VM 2f371a89-b004-400b-a249-6099e88feefc.',
		'47e33f30-5226-4638-b376-53bc09fc72a6':
		    'Adding VM 70671b04-0e6b-4f28-8650-c1728da4e41b. ' +
		    'Adding VM f2e725ec-86d0-434a-8642-b461e48cf059.'
	};

	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.post = function (t)
{
	var vmUuid = 'bc2584ed-f218-4df5-a35a-416338e57734';
	var now = +new Date();
	var server = { uuid: 'e00bba42-3242-4652-8e8f-30e19e1b03ec' };

	var constraints = {
		vm: {
			vm_uuid: vmUuid,
			owner_uuid: '50795a63-3542-4f81-9cdd-36a19069ea49'
		},
		pkg: {
			max_physical_memory: 512, /* in MiB */
			cpu_cap: 700,
			quota: 10 * 1024 /* in MiB */
		},
		img: {
			type: 'smartos'
		}
	};

	var state  = { recent_vms: [] };

	var expectedState = {
		recent_vms: [
			{
				uuid: vmUuid,
				owner_uuid:
				    '50795a63-3542-4f81-9cdd-36a19069ea49',
				max_physical_memory: 512,
				cpu_cap: 700,
				quota: 10,
				brand: 'smartos',
				state: 'running',
				server_uuid: server.uuid
			}
		]
	};

	filter.post(log, state, server, null, constraints);

	var created_at = state.recent_vms[0].created_at;
	t.ok(now <= created_at && created_at <= +new Date());

	var last_modified = +new Date(state.recent_vms[0].last_modified);
	t.ok(now <= last_modified && last_modified <= +new Date());

	delete state.recent_vms[0].created_at;
	delete state.recent_vms[0].last_modified;

	t.deepEqual(state, expectedState);
	t.done();
};

/* this can happen when an allocation fails */
exports.post_without_server = function (t)
{
	var constraints = {
		vm: {
			vm_uuid: 'bc2584ed-f218-4df5-a35a-416338e57734',
			owner_uuid: '50795a63-3542-4f81-9cdd-36a19069ea49'
		},
		pkg: {
			max_physical_memory: 512, /* in MiB */
			cpu_cap: 700,
			quota: 10 * 1024 /* in MiB */
		},
		img: {
			type: 'smartos'
		}
	};

	var state  = { recent_vms: [] };

	filter.post(log, state, null, null, constraints);

	t.deepEqual(state, { recent_vms: [] });
	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
