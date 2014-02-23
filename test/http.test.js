/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var common = require('./common');



var client;
var servers = [ {
    uuid: '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
    ram: 2048,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 2147483648,
    memory_available_bytes: 1073741824,
    disk_pool_size_bytes: 1099511627776,
    disk_installed_images_used_bytes: 1073741824,
    disk_zone_quota_bytes: 53687091200,
    disk_kvm_quota_bytes: 0,
    disk_kvm_zvol_volsize_bytes: 0,
    reservation_ratio: 0.15,
    rack_identifier: 'ams-1',
    sysinfo: {
        'Zpool Size in GiB': 1024,
        'CPU Total Cores': 16,
        'SDC Version': '7.0',
        'Live Image': '20121210T203034Z',
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
    },
    vms: {
        '564d9386-8c67-b674-587f-101f1db2eda7': {
            uuid: '564d9386-8c67-b674-587f-101f1db2eda7',
            owner_uuid: '8edf8cdc-a96f-4dee-8566-687f2ea75f84',
            brand: 'joyent',
            quota: 50,
            max_physical_memory: 512,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        }
    }
}, {
    uuid: '85526a01-9310-44fd-9637-ed1501cc69a1',
    ram: 1024,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 1073741824,
    memory_available_bytes: 536870912,
    disk_pool_size_bytes: 1099511627776,
    disk_installed_images_used_bytes: 1073741824,
    disk_zone_quota_bytes: 0,
    disk_kvm_quota_bytes: 107374182400,
    disk_kvm_zvol_volsize_bytes: 85899345920,
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
        'Zpool Size in GiB': 1024,
        'CPU Total Cores': 16,
        'SDC Version': '7.0',
        'Live Image': '20130122T122401Z',
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
    },
    vms: {
        'f954f487-0e70-4e76-b87b-38182a6e3b4d': {
            uuid: 'f954f487-0e70-4e76-b87b-38182a6e3b4d',
            owner_uuid: '5ae17d0f-652a-4cbe-9b35-3c058793aee1',
            brand: 'kvm',
            quota: 50,
            max_physical_memory: 128,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        },
        '0e07ab09-d725-436f-884a-759fa3ed7183': {
            uuid: '0e07ab09-d725-436f-884a-759fa3ed7183',
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            brand: 'kvm',
            quota: 50,
            max_physical_memory: 128,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        }
    }
}, {
    uuid: 'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
    ram: 1024,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 1073741824,
    memory_available_bytes: 536870912,
    disk_pool_size_bytes: 1099511627776,
    disk_installed_images_used_bytes: 2147483648,
    disk_zone_quota_bytes: 53687091200,
    disk_kvm_quota_bytes: 53687091200,
    disk_kvm_zvol_volsize_bytes: 42949672960,
    overprovision_ratios: { ram: 1.5 },
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
        'Zpool Size in GiB': 1024,
        'CPU Total Cores': 16,
        'SDC Version': '7.0',
        'Live Image': '20130122T122401Z',
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
    },
    vms: {
        '813b0c77-8e8d-4fbb-83e2-0dc0a3ba388a': {
            uuid: '813b0c77-8e8d-4fbb-83e2-0dc0a3ba388a',
            owner_uuid: 'ba09128c-ddf2-4bc4-9a16-a556afdc55b5',
            brand: 'kvm',
            quota: 50,
            max_physical_memory: 512,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        },
        '4ab04a6b-f045-41fe-a61a-8eb91604d0a1': {
            uuid: '4ab04a6b-f045-41fe-a61a-8eb91604d0a1',
            owner_uuid: '2f100ea6-74c4-4c4f-9751-499e1aaad769',
            brand: 'joyent',
            quota: 50,
            max_physical_memory: 512,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        }
    }
}, {
    uuid: '2555c9f0-d2b4-40b3-9346-81205e45a10e',
    ram: 1024,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 1073741824,
    memory_available_bytes: 536870912,
    disk_pool_size_bytes: 1099511627776,
    disk_installed_images_used_bytes: 2147483648,
    disk_zone_quota_bytes: 128849018880,
    disk_kvm_quota_bytes: 64424509440,
    disk_kvm_zvol_volsize_bytes: 53687091200,
    overprovision_ratios: { disk: 2.0 },
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
        'Zpool Size in GiB': 1024,
        'CPU Total Cores': 16,
        'SDC Version': '7.0',
        'Live Image': '20130122T122401Z',
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
    },
    vms: {
        'ae47a2a5-3523-4f10-a972-8eb5563dcb91': {
            uuid: 'ae47a2a5-3523-4f10-a972-8eb5563dcb91',
            owner_uuid: 'ba09128c-ddf2-4bc4-9a16-a556afdc55b5',
            brand: 'kvm',
            quota: 50,
            max_physical_memory: 256,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        },
        '6d119198-69e3-45dc-921f-8e51e976c8d5': {
            uuid: '6d119198-69e3-45dc-921f-8e51e976c8d5',
            owner_uuid: '2f100ea6-74c4-4c4f-9751-499e1aaad769',
            brand: 'joyent',
            quota: 120,
            max_physical_memory: 768,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        }
    }
}, {
    uuid: '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
    ram: 1024,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 1073741824,
    memory_available_bytes: 536870912,
    disk_pool_size_bytes: 1099511627776,
    disk_installed_images_used_bytes: 3221225472,
    disk_zone_quota_bytes: 0,
    disk_kvm_quota_bytes: 0,
    disk_kvm_zvol_volsize_bytes: 0,
    overprovision_ratios: { cpu: 2.0 },
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
        'Zpool Size in GiB': 1024,
        'CPU Total Cores': 16,
        'SDC Version': '7.0',
        'Live Image': '20130122T122401Z',
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
    },
    vms: {}
}, {
    uuid: 'bc415a07-4af3-4ce5-b493-4b4d0c93082a',
    ram: 1024,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 1073741824,
    memory_available_bytes: 536870912,
    disk_pool_size_bytes: 1099511627776,
    disk_installed_images_used_bytes: 3221225472,
    disk_zone_quota_bytes: 0,
    disk_kvm_quota_bytes: 0,
    disk_kvm_zvol_volsize_bytes: 0,
    overprovision_ratios: { ram: 1.5, disk: 2.0, cpu: 2.0 },
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
        'Zpool Size in GiB': 1024,
        'CPU Total Cores': 16,
        'SDC Version': '7.0',
        'Live Image': '20130122T122401Z',
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
    },
    vms: {}
} ];



exports.setUp =  function (callback) {
    common.setup(function (err, _client) {
        assert.ifError(err);
        assert.ok(_client);
        client = _client;
        callback();
    });
};



exports.allocation_ok_1 = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { vm_uuid: '00f2b6e4-b305-432d-84b9-70d81df10d10',
                       ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'f176970e-6f1a-45d0-a1ea-2a61a76cf7e5',
                       override_recent_vms: true },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_ok_2 = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { vm_uuid: '4e206b6b-5317-40c2-9b90-ad560528b2a3',
                       ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
                       override_recent_vms: true },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[0].uuid);
        t.done();
    });
};



exports.allocation_ok_3 = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { vm_uuid: 'c122b0dc-d560-479c-978b-0021da55acad',
                       ram: 256,
                       brand: 'kvm',
                       nic_tags: [ 'external' ],
                       owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
                       override_recent_vms: true },
                 image: { image_size: 51200 } };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[0].uuid);
        t.done();
    });
};



// should fail in this case because traits mismatch
exports.allocation_fails = function (t) {
    var server = {
        uuid: 'd72fad32-3a2b-419a-a878-4f53bdad7352',
        ram: 2048,
        setup: true,
        reserved: false,
        status: 'running',
        memory_total_bytes: 2147483648,
        memory_available_bytes: 1073741824,
        disk_pool_size_bytes: 1099511627776,
        disk_installed_images_used_bytes: 1073741824,
        disk_zone_quota_bytes: 53687091200,
        disk_kvm_quota_bytes: 0,
        disk_kvm_zvol_volsize_bytes: 0,
        reservation_ratio: 0.15,
        rack_identifier: 'ams-1',
        sysinfo: {
            'Zpool Size in GiB': 1024,
            'CPU Total Cores': 16,
            'SDC Version': '7.0',
            'Live Image': '20121210T203034Z',
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
        },
        vms: {},
        traits: { foo: 'bar' }
    };

    var path = '/allocation';

    var data = { servers: [ server ],
                 vm: { vm_uuid: 'c122b0dc-d560-479c-978b-0021da55acad',
                       ram: 256,
                       brand: 'kvm',
                       nic_tags: [ 'external' ],
                       owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
                       override_recent_vms: true },
                 image: { image_size: 51200 } };

    client.post(path, data, function (err, req, res, body) {
        t.ok(err);
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);

        t.ok(body);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, 'No allocatable servers found. Last step was: ' +
                              'Servers with correct traits');
        t.ok(body.steps);

        t.done();
    });
};



exports.allocation_with_locality_hints_near = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { vm_uuid: 'a5ec0a67-e1e0-4df4-a978-1e9ac7b34537',
                       ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
                       locality: {
                         near: '0e07ab09-d725-436f-884a-759fa3ed7183'
                       },
                       override_recent_vms: true },
                 image: {}
             };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        // XXX: this should probably be 2 (same rack, different server), but the
        // logic of the pipeline means that servers[2] is probably filtered out
        // before the locality plugin. Need to fix that.
        t.equal(body.server.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_with_locality_hints_far = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { vm_uuid: '1baf0c09-aa2c-4620-9688-43072f651b63',
                       ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
                       locality: {
                         far: ['0e07ab09-d725-436f-884a-759fa3ed7183']
                       },
                       override_recent_vms: true },
                 image: {}
             };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[0].uuid);
        t.done();
    });
};



exports.allocation_image_max_platform = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: '227dacd6-7e33-4f0e-bb5d-7fd204a73458',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            requirements: {
                max_platform: {
                    '6.5': '20121218T203452Z',
                    '7.0': '20121218T203452Z'
                }
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[0].uuid);
        t.done();
    });
};



exports.allocation_image_min_platform = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: 'b0e0296d-3ff0-499b-8ed9-f8d3be98dd83',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            requirements: {
                min_platform: { '7.0': '20130122T122401Z' }
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_package_max_platform = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: '1f87932b-c53d-44fd-9199-7f9556bd9ef0',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {},
        package: {
           // can be hash, but must support JSON too
           max_platform: '{"6.5":"20121218T203452Z", "7.0":"20121218T203452Z"}'
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[0].uuid);
        t.done();
    });
};



exports.allocation_package_min_platform = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: '7beee9e1-3488-4696-8a93-6403372bc150',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {},
        package: {
           // can be hash, but must support JSON too
            min_platform: '{"7.0": "20130122T122401Z"}'
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_with_traits = function (t) {
    var path = '/allocation';

    // make sure to undo this change at end of this function
    var originalServerTraits = servers[1].traits;

    servers[1].traits = { ssd: true, users: ['john'] };

    var data = {
        servers: servers,
        vm: {
            vm_uuid: 'a6246996-d589-4d29-9c39-3c40b3ceddf5',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            traits: { ssd: true },
            override_recent_vms: true
        },
        image: {
            traits: { users: 'john' }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[1].uuid);

        // undo change to server traits
        servers[1].traits = originalServerTraits;

        t.done();
    });
};



exports.allocation_with_package_traits = function (t) {
    var path = '/allocation';

    // make sure to undo this change at end of this function
    var originalServerTraits = servers[1].traits;

    servers[1].traits = { ssd: true, users: ['john'] };

    var data = {
        servers: servers,
        vm: {
            vm_uuid: 'c25e2823-2317-4570-af89-aebc6cf7cc95',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            traits: { users: 'john' }
        },
        package: {
            traits: { ssd: true }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[1].uuid);

        // undo change to server traits
        servers[1].traits = originalServerTraits;

        t.done();
    });
};



exports.allocation_overprovisioning_memory = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: '8da652b0-5ee1-42cc-952c-0287a4a5c1f2',
            ram: 256,
            owner_uuid: '91b332e7-b0ab-4c40-bfe3-b2674ec5253f',
            override_recent_vms: true
        },
        package: {
            overprovision_memory: 1.5
        },
        image: {}
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[2].uuid);

        t.done();
    });
};



exports.allocation_overprovisioning_storage = function (t) {
    var path = '/allocation';

    // there should be 932GB calculated free on disk. We're adding another zone
    // which is overprovisioned by 2. We're checking the lower bound here (and
    // see next test)
    var data = {
        servers: servers,
        vm: {
            vm_uuid: '498a9cf1-947e-472a-85e3-64dee70bcae9',
            ram: 256,
            quota: 930 * 2 * 1024,
            owner_uuid: '91b332e7-b0ab-4c40-bfe3-b2674ec5253f',
            override_recent_vms: true
        },
        package: {
            overprovision_storage: 2.0
        },
        image: {}
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[3].uuid);

        t.done();
    });
};



exports.allocation_overprovisioning_storage_insufficient = function (t) {
    var path = '/allocation';

    // there should be 932GB calculated free on disk. We're adding another zone
    // which is overprovisioned by 2. We're checking the upper bound here (and
    // see previous test)
    var data = {
        servers: servers,
        vm: {
            vm_uuid: '97ce7e37-d7ea-4562-913e-bb2c490ec4b8',
            ram: 256,
            quota: 940 * 2 * 1024,
            owner_uuid: '91b332e7-b0ab-4c40-bfe3-b2674ec5253f',
            override_recent_vms: true
        },
        package: {
            overprovision_storage: 2.0
        },
        image: {}
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);

        t.done();
    });
};



exports.allocation_overprovisioning_cpu = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: 'b827e4dd-231a-4101-a103-d6a8cb439445',
            ram: 256,
            cpu_cap: 700,
            owner_uuid: '91b332e7-b0ab-4c40-bfe3-b2674ec5253f',
            override_recent_vms: true
        },
        package: {
            overprovision_cpu: 2.0
        },
        image: {}
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[4].uuid);

        t.done();
    });
};



exports.allocation_overprovisioning_all = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: 'b91620f6-5cdc-4d44-bca4-3dcca9eb8e04',
            ram: 256,
            quota: 2048,
            cpu_cap: 700,
            owner_uuid: '91b332e7-b0ab-4c40-bfe3-b2674ec5253f',
            override_recent_vms: true
        },
        package: {
            overprovision_memory:  1.5,
            overprovision_storage: 2.0,
            overprovision_cpu:     2.0
        },
        image: {}
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.ok(body.steps);
        t.equal(body.server.uuid, servers[5].uuid);

        t.done();
    });
};



exports.allocation_steps = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { vm_uuid: '5f0ccb76-2878-43a8-97c9-7e17cf75e637',
                       ram: 2048,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'f176970e-6f1a-45d0-a1ea-2a61a76cf7e5',
                       override_recent_vms: true },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, 'No allocatable servers found. Last step was: ' +
                              'Servers with enough unreserved RAM');

        var expected = [
          { step: 'Received by DAPI',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers which have been setup',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers objects which are valid',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Add VMs which have been allocated to recently',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Calculate unreserved resources on each server',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Calculate localities of owner\'s VMs',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers which are not reserved',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers which are not headnodes',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers which are currently running',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers which meet image manifest platform requirements',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers with correct traits',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1',
                         'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b',
                         '2555c9f0-d2b4-40b3-9346-81205e45a10e',
                         '48ad03e8-da51-4c25-ab39-0e4bb204b24a',
                         'bc415a07-4af3-4ce5-b493-4b4d0c93082a' ] },
          { step: 'Servers with same overprovision ratios as requested VM',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1' ],
            /* BEGIN JSSTYLED */
            reasons:  { '48ad03e8-da51-4c25-ab39-0e4bb204b24a': 'Package over-provision ratio of null does not match server\'s 2.00',
                        'bc415a07-4af3-4ce5-b493-4b4d0c93082a': 'Package over-provision ratio of null does not match server\'s 2.00',
                        'f6ca7d77-f9ff-4c8a-8a1d-75f85d41158b': 'Package over-provision ratio of 1.00 does not match server\'s 1.50',
                        '2555c9f0-d2b4-40b3-9346-81205e45a10e': 'Package over-provision ratio of 1.00 does not match server\'s null' } },
            /* END JSSTYLED */
          { step: 'Servers which are not in the reservoir',
            remaining: [ '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
                         '85526a01-9310-44fd-9637-ed1501cc69a1' ] },
          { step: 'Servers with enough unreserved RAM',
            remaining: [],
            /* BEGIN JSSTYLED */
            reasons: { '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd': 'VM\'s calculated 2048 RAM is less than server\'s spare 1228',
                       '85526a01-9310-44fd-9637-ed1501cc69a1': 'VM\'s calculated 2048 RAM is less than server\'s spare 614' } },
            /* END JSSTYLED */
          { step: 'Servers with enough unreserved RAM',
            remaining: [],
            /* BEGIN JSSTYLED */
            reasons: { '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd': 'VM\'s calculated 2048 RAM is less than server\'s spare 1228',
                       '85526a01-9310-44fd-9637-ed1501cc69a1': 'VM\'s calculated 2048 RAM is less than server\'s spare 614' } }
            /* END JSSTYLED */
        ];

        t.deepEqual(body.steps, expected);

        t.done();
    });
};



exports.allocation_using_reservoirs = function (t) {
    var path = '/allocation';

    var testServers = [ {
        uuid: 'd6c975eb-928d-4362-b53d-b9b5515df71d',
        ram: 2048,
        setup: true,
        reserved: false,
        status: 'running',
        memory_total_bytes: 2147483648,
        memory_available_bytes: 1073741824,
        disk_pool_size_bytes: 1099511627776,
        disk_installed_images_used_bytes: 1073741824,
        disk_zone_quota_bytes: 0,
        disk_kvm_quota_bytes: 0,
        disk_kvm_zvol_volsize_bytes: 0,
        reservation_ratio: 0.15,
        rack_identifier: 'ams-1',
        sysinfo: {
            'Zpool Size in GiB': 1024,
            'CPU Total Cores': 16,
            'SDC Version': '7.0',
            'Live Image': '20121210T203034Z',
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
        },
        vms: {}
    }, {
        uuid: '1c78b1f6-f93e-4bd3-8265-f53b727be549',
        ram: 2048,
        setup: true,
        reserved: false,
        reservoir: true,
        status: 'running',
        memory_total_bytes: 2147483648,
        memory_available_bytes: 536870912,
        disk_pool_size_bytes: 1099511627776,
        disk_installed_images_used_bytes: 1073741824,
        disk_zone_quota_bytes: 0,
        disk_kvm_quota_bytes: 0,
        disk_kvm_zvol_volsize_bytes: 0,
        reservation_ratio: 0.15,
        rack_identifier: 'ams-1',
        sysinfo: {
            'Zpool Size in GiB': 2048,
            'CPU Total Cores': 16,
            'SDC Version': '7.0',
            'Live Image': '20130122T122401Z',
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
        },
        vms: {}
    } ];

    var expectedStepsWithoutReservoir = [
        { step: 'Received by DAPI',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which have been setup',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers objects which are valid',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Add VMs which have been allocated to recently',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Calculate unreserved resources on each server',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Calculate localities of owner\'s VMs',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are not reserved',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are not headnodes',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are currently running',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which meet image manifest platform requirements',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with correct traits',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with same overprovision ratios as requested VM',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d',
                       '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are not in the reservoir',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Servers with enough unreserved RAM',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Servers with enough unreserved disk',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Servers with enough unreserved CPU',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Filter out the largest and most empty servers',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Servers with requested locality considered',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Sort servers by minimum unreserved RAM',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] },
        { step: 'Random weighted server',
          remaining: [ 'd6c975eb-928d-4362-b53d-b9b5515df71d' ] }
    ];

    var expectedStepsUsingReservoir = [
        { step: 'Received by DAPI',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which have been setup',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers objects which are valid',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Add VMs which have been allocated to recently',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Calculate unreserved resources on each server',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Calculate localities of owner\'s VMs',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are not reserved',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are not headnodes',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are currently running',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which meet image manifest platform requirements',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with correct traits',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with same overprovision ratios as requested VM',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers which are not in the reservoir',
          remaining: [] },
        { step: 'Servers with enough unreserved RAM',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with enough unreserved disk',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with enough unreserved CPU',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Filter out the largest and most empty servers',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Servers with requested locality considered',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Sort servers by minimum unreserved RAM',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] },
        { step: 'Random weighted server',
          remaining: [ '1c78b1f6-f93e-4bd3-8265-f53b727be549' ] }
    ];

    var data = { servers: testServers,
                 vm: { vm_uuid: 'ff1eb91e-2738-46fd-adcb-0871113d8f77',
                       ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'f176970e-6f1a-45d0-a1ea-2a61a76cf7e5',
                       override_recent_vms: true },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.equal(body.server.uuid, testServers[0].uuid);
        t.deepEqual(body.steps, expectedStepsWithoutReservoir);

        // we remove the non-reservoir server, and see whether it'll now
        // resort to the reservoir server
        testServers.shift();

        client.post(path, data, function (err2, req2, res2, body2) {
            t.ifError(err2);
            t.equal(res2.statusCode, 200);
            common.checkHeaders(t, res2.headers);
            t.equal(body2.server.uuid, testServers[0].uuid);
            t.deepEqual(body2.steps, expectedStepsUsingReservoir);

            t.done();
        });
    });
};



exports.allocation_malformed_image_1 = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: '401630e6-042c-4908-a3db-f63fe8a3c526',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            requirements: {
                max_platform: { '7.0': '2012-12-18' }
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, '"requirements.max_platform" contains an ' +
                              'invalid platform date');
        t.done();
    });
};



exports.allocation_malformed_image_2 = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: '350d72cf-d341-4f13-bc25-2397fd16a7af',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            requirements: {
                max_platform: [ ['7.0', '20121218T203452Z'] ]
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, '"requirements.max_platform" is not a hash');
        t.done();
    });
};



exports.allocation_malformed_image_3 = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            vm_uuid: 'b4354420-4f06-484a-9225-314a4b9c383b',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            image_size: 'foobar'
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, '"image.image_size" has invalid type');
        t.done();
    });
};



exports.vm_ram_smaller_than_image_requirement = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        image: {},
        vm: {
            vm_uuid: '9191c8a1-737f-47f6-b4fc-d21ffb0cd2d8',
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            requirements: {
                min_ram: 512
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, '"vm.ram" is smaller than ' +
                              '"image.requirements.min_ram"');
        t.done();
    });
};



exports.vm_ram_larger_than_image_requirement = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        image: {},
        vm: {
            vm_uuid: '43165e66-3741-421d-bb71-94c9a466f863',
            ram: 768,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        },
        image: {
            requirements: {
                max_ram: 512
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, '"vm.ram" is larger than ' +
                              '"image.requirements.max_ram"');
        t.done();
    });
};



exports.malformed_vm = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        image: {},
        vm: {
            vm_uuid: 'f728b225-909e-4129-bae8-570e3db2f124',
            ram: 'not-a-number',
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, 'VM "ram" is not a number');
        t.done();
    });
};



exports.vm_with_malformed_traits = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        image: {},
        vm: {
            vm_uuid: '60b0681d-fff8-4aea-aeee-9a5625fd6f3b',
            ram: 768,
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            traits: { true: 1 },
            override_recent_vms: true
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, 'VM Trait "true" is an invalid type');
        t.done();
    });
};



exports.vm_with_missing_vm_uuid = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        image: {},
        vm: {
            ram: 768,
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            override_recent_vms: true
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, '"vm.vm_uuid" is an invalid UUID');
        t.done();
    });
};



exports.ping = function (t) {
    client.get('/ping', function (err, req, res, body) {
        t.equal(res.statusCode, 200);
        t.equal(body.status, 'running');
        t.done();
    });
};
