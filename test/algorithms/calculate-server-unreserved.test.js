/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/calculate-server-unreserved.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.calculateServerUnreserved =
function (t) {
    var serversInfo = [
        {
            memory_total_bytes: 2942881792,
            disk_pool_size_bytes: 41875931136,
            disk_installed_images_used_bytes: 1073741824,
            disk_zone_quota_bytes: 0,
            disk_kvm_quota_bytes: 32212254720,
            reservation_ratio: 0.15,
            sysinfo: {
                'Zpool Size in GiB': 39,
                'CPU Total Cores': 16
            },
            vms: {
                '1ac434da-01aa-4663-8420-d3524ed1de0c': {
                    cpu_cap: 350,
                    quota: 25,
                    max_physical_memory: 2048
                },
                'b3d04682-536f-4f09-8170-1954e45e9e1c': {
                    cpu_cap: 350,
                    quota: 5,
                    max_physical_memory: 128
                }
            }
        },
        {
            memory_total_bytes: 9132881112,
            disk_pool_size_bytes: 55834574848,
            disk_installed_images_used_bytes: 2147483648,
            disk_zone_quota_bytes: 21474836480,
            disk_kvm_quota_bytes: 10737418240,
            reservation_ratio: 0.25,
            sysinfo: {
                'Zpool Size in GiB': 52,
                'CPU Total Cores': 24
            },
            vms: {
                '62559b33-4f3a-4505-a942-87cc557fdf4e': {
                    cpu_cap: 350,
                    quota: 20,
                    max_physical_memory: 512
                },
                '335498f7-a1ed-420c-8367-7f2769ca1e84': {
                    cpu_cap: 350,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        },
        {
            overprovision_ratios: { ram: 1.5 },
            memory_total_bytes: 9132881112,
            disk_pool_size_bytes: 55834574848,
            disk_installed_images_used_bytes: 3221225472,
            disk_zone_quota_bytes: 32212254720,
            disk_kvm_quota_bytes: 0,
            reservation_ratio: 0.15,
            sysinfo: {
                'Zpool Size in GiB': 52,
                'CPU Total Cores': 32
            },
            vms: {
                '62559b33-4f3a-4505-a942-87cc557fdf4e': {
                    cpu_cap: 350,
                    quota: 20,
                    max_physical_memory: 512
                },
                '335498f7-a1ed-420c-8367-7f2769ca1e84': {
                    cpu_cap: 350,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        },
        {
            overprovision_ratios: { ram: 1.5, disk: 2.0, cpu: 2.0 },
            memory_total_bytes: 9132881112,
            disk_pool_size_bytes: 55834574848,
            disk_installed_images_used_bytes: 4294967296,
            disk_zone_quota_bytes: 21474836480,
            disk_kvm_quota_bytes: 10737418240,
            reservation_ratio: 0.15,
            sysinfo: {
                'Zpool Size in GiB': 52,
                'CPU Total Cores': 32
            },
            vms: {
                'd251001f-57eb-4360-a04a-96d7d20a520c': {
                    cpu_cap: 700,
                    quota: 20,
                    max_physical_memory: 512
                },
                '9dd471a6-4679-4201-a02d-5e824deefc3e': {
                    cpu_cap: 200,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        }
    ];

    var state = {};
    var servers = filter.run(log, state, serversInfo);
    t.deepEqual(state, {});

    t.equal(servers[0].unreserved_disk, 38912);
    t.equal(servers[0].unreserved_ram,  209);
    t.equal(servers[0].unreserved_cpu,  1600);

    t.equal(servers[1].unreserved_disk, 51200);
    t.equal(servers[1].unreserved_ram,  1924);
    t.equal(servers[1].unreserved_cpu,  2400);

    t.equal(servers[2].unreserved_disk, 50176);
    t.equal(servers[2].unreserved_ram,  4331);
    t.equal(servers[2].unreserved_cpu,  3200);

    t.equal(servers[3].unreserved_disk, 33792);
    t.equal(servers[3].unreserved_ram,  4331);
    t.equal(servers[3].unreserved_cpu,  2750);

    t.done();
};



exports.calculateServerUnreserved_no_servers =
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
