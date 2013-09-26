/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-invalid-servers.js');

var log = { trace: function () { return true; },
            debug: function () { return true; },
            warn:  function () { return true; } };



exports.filterInvalidServers =
function (t) {
    var MB = 1024 * 1024;
    var GB = 1024 * MB;

    var serversInfo = [
        {
            uuid: 'dd5dac66-b4be-4b75-859b-b375bc577e90',
            memory_total_bytes: 96 * GB,
            memory_available_bytes: 24 * GB,
            disk_pool_size_bytes: 2048 * GB,
            disk_installed_images_used_bytes: 1 * GB,
            disk_zone_quota_bytes: 0,
            disk_kvm_quota_bytes: (25 + 5 + 10 + 10) * GB,
            disk_kvm_zvol_volsize_bytes: (25 + 5) * GB,
            reservation_ratio: 0.15,
            reserved: true,
            setup: true,
            sysinfo: {
                'Zpool Size in GiB': 2048,
                'CPU Total Cores': 16
            },
            vms: {
                '1ac434da-01aa-4663-8420-d3524ed1de0c': {
                    owner_uuid: '00fd780e-f265-42ac-b800-60fdd3f20fb8',
                    brand: 'kvm',
                    cpu_cap: 350,
                    quota: 25,
                    max_physical_memory: 2048
                },
                'b3d04682-536f-4f09-8170-1954e45e9e1c': {
                    // missing owner_uuid
                    brand: 'kvm',
                    cpu_cap: 350,
                    quota: 5,
                    max_physical_memory: 128
                }
            }
        },
        {
            uuid: '390d2a35-8b54-449a-a82d-6c0c623afc8c',
            // missing memory_total_bytes
            memory_available_bytes: 36 * GB,
            disk_pool_size_bytes: 2048 * GB,
            disk_installed_images_used_bytes: 2 * GB,
            disk_zone_quota_bytes: 20 * GB,
            disk_kvm_quota_bytes: (10 + 10) * GB,
            disk_kvm_zvol_volsize_bytes: 10 * GB,
            reservation_ratio: 0.25,
            reserved: false,
            setup: true,
            sysinfo: {
                'Zpool Size in GiB': 2048,
                'CPU Total Cores': 24
            },
            vms: {
                '62559b33-4f3a-4505-a942-87cc557fdf4e': {
                    owner_uuid: 'a79de91a-1b60-4d97-94bd-49d056c0a4e6',
                    brand: 'joyent',
                    cpu_cap: 350,
                    quota: 20,
                    max_physical_memory: 512
                },
                '335498f7-a1ed-420c-8367-7f2769ca1e84': {
                    owner_uuid: 'fa08a498-3264-4ec0-99ef-365731a1c9cc',
                    brand: 'kvm',
                    cpu_cap: 350,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        },
        {
            uuid: '6a6ffadd-e274-4089-a561-ccbdc894ae76',
            overprovision_ratios: { ram: 1.5 },
            memory_total_bytes: 512 * GB,
            memory_available_bytes: 300 * GB,
            disk_pool_size_bytes: 4096 * GB,
            disk_installed_images_used_bytes: 3 * GB,
            disk_zone_quota_bytes: (20 + 10) * GB,
            disk_kvm_quota_bytes: 0,
            disk_kvm_zvol_volsize_bytes: 0,
            reservation_ratio: 0.15,
            reserved: false,
            setup: true,
            sysinfo: {
                'Zpool Size in GiB': 4096,
                'CPU Total Cores': 32
            },
            vms: {
                '62559b33-4f3a-4505-a942-87cc557fdf4e': {
                    owner_uuid: 'e14b2bef-e75f-43f6-9590-ff4c3d18fad6',
                    brand: 'joyent',
                    cpu_cap: 350,
                    quota: 20,
                    max_physical_memory: 512
                },
                '335498f7-a1ed-420c-8367-7f2769ca1e84': {
                    owner_uuid: '24ccd11a-fb18-45e8-99ea-a2b561352526',
                    brand: 'joyent',
                    cpu_cap: 350,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        },
        {
            uuid: 'd0c1bacd-77b2-409a-a629-9ada5cc0eef9',
            overprovision_ratios: { ram: 1.5, disk: 2.0, cpu: 2.0 },
            memory_total_bytes: 256 * GB,
            memory_available_bytes: 72 * GB,
            disk_pool_size_bytes: 4096 * GB,
            disk_installed_images_used_bytes: 4 * GB,
            disk_zone_quota_bytes: (20 + 30) * GB,
            disk_kvm_quota_bytes: (10 + 30) * GB,
            disk_kvm_zvol_volsize_bytes: 30 * GB,
            reservation_ratio: 0.15,
            // reserved is a string instead of a boolean
            reserved: 'false',
            setup: true,
            sysinfo: {
                'Zpool Size in GiB': 4096,
                'CPU Total Cores': 32
            },
            vms: {
                'd251001f-57eb-4360-a04a-96d7d20a520c': {
                    owner_uuid: '42e3e011-6435-4b4a-bb2e-8547bbd2d2dd',
                    brand: 'joyent',
                    state: 'running',
                    cpu_cap: 700,
                    quota: 20,
                    max_physical_memory: 512
                },
                '9dd471a6-4679-4201-a02d-5e824deefc3e': {
                    owner_uuid: '08c55217-b479-42af-8968-4ae52c183241',
                    brand: 'kvm',
                    state: 'installed',
                    cpu_cap: 200,
                    quota: 30,
                    max_physical_memory: 4096
                },
                '3575c7b5-e644-4357-8b89-9188a883da8d': {
                    owner_uuid: 'ffc02424-c50d-4fa8-bb63-d848ac55ea21',
                    brand: 'joyent',
                    state: 'failed',
                    cpu_cap: 200,
                    quota: 30,
                    max_physical_memory: 4096
                }
            }
        }
    ];

    var state = {};
    var servers = filter.run(log, state, serversInfo);
    t.deepEqual(state, {});

    t.equal(servers.length, 1);
    t.deepEqual(servers[0].uuid, '6a6ffadd-e274-4089-a561-ccbdc894ae76');

    t.done();
};



exports.filterInvalidServers_no_servers =
function (t) {
    var state = {};

    var servers = filter.run(log, state, []);

    t.deepEqual(servers, []);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
