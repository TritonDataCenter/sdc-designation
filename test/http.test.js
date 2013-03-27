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
    reservation_ratio: 0.15,
    rack_identifier: 'ams-1',
    sysinfo: {
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
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
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
            quota: 50,
            max_physical_memory: 128,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        },
        '0e07ab09-d725-436f-884a-759fa3ed7183': {
            uuid: '0e07ab09-d725-436f-884a-759fa3ed7183',
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
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
    overprovision_ratio: 1.5,
    reservation_ratio: 0.15,
    rack_identifier: 'ams-2',
    sysinfo: {
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
            quota: 50,
            max_physical_memory: 512,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        },
        '4ab04a6b-f045-41fe-a61a-8eb91604d0a1': {
            uuid: '4ab04a6b-f045-41fe-a61a-8eb91604d0a1',
            owner_uuid: '2f100ea6-74c4-4c4f-9751-499e1aaad769',
            quota: 50,
            max_physical_memory: 512,
            zone_state: 'running',
            state: 'running',
            last_modified: '2012-12-19T05:26:05.000Z'
        }
    }
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
                 vm: { ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'f176970e-6f1a-45d0-a1ea-2a61a76cf7e5' },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.equal(body.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_ok_2 = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { ram: 256,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb' },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.equal(body.uuid, servers[0].uuid);
        t.done();
    });
};



exports.allocation_max_platform = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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
        t.equal(body.uuid, servers[0].uuid);
        t.done();
    });
};



exports.allocation_min_platform = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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
        t.equal(body.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_with_traits = function (t) {
    var path = '/allocation';

    // make sure to undo this change at end of this function
    var originalServerTraits = servers[0].traits;

    servers[1].traits = { ssd: true, users: ['john'] };

    var data = {
        servers: servers,
        vm: {
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            traits: { ssd: true }
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
        t.equal(body.uuid, servers[1].uuid);

        // undo change to server traits
        servers[1].traits = originalServerTraits;

        t.done();
    });
};



exports.allocation_overprovisioning = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 256,
            owner_uuid: '91b332e7-b0ab-4c40-bfe3-b2674ec5253f',
            overprovision_ratio: 1.5
        },
        image: {}
    };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.equal(body.uuid, servers[2].uuid);

        t.done();
    });
};



exports.allocation_not_enough_server_ram = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { ram: 2048,
                       nic_tags: [ 'external' ],
                       owner_uuid: 'f176970e-6f1a-45d0-a1ea-2a61a76cf7e5' },
                 image: {} };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.equal(body.code, 'InvalidArgument');
        t.equal(body.message, 'No allocatable servers found');
        t.done();
    });
};



exports.allocation_malformed_image_1 = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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



exports.vm_ram_smaller_than_image_requirement = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 256,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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
        vm: {
            ram: 768,
            nic_tags: [ 'external' ],
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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



exports.vm_with_malformed_traits = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 768,
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb',
            traits: { true: 1 }
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



exports.malformed_vm = function (t) {
    var path = '/allocation';

    var data = {
        servers: servers,
        vm: {
            ram: 'not-a-number',
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
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
