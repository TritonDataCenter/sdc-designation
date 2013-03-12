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
    rack_identifier: 'ams-1',
    current_platform: '20121210T203034Z',
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
    rack_identifier: 'ams-2',
    current_platform: '20130122T122401Z',
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



exports.allocation_ok_3 = function (t) {
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
                max_platform: [
                    ['6.5', '20121218T203452Z'],
                    ['7.0', '20121218T203452Z']
                ]
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



exports.allocation_ok_4 = function (t) {
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
                min_platform: [
                    ['7.0', '20130122T122401Z']
                ]
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



exports.allocation_ok_5 = function (t) {
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
        t.ok(body);
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
                max_platform: [['7.0', '2012-12-18']]
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.ok(body);
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
                max_platform: [ {'7.0': '20121218T203452Z'} ]
            }
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.ok(body);
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
        t.ok(body);
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
        t.ok(body);
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
        t.ok(body);
        t.done();
    });
};



exports.vm_with_malformed_traits = function (t) {
    var path = '/allocation';

    var server = {
        uuid: '19ef07c1-cbfb-4794-b16f-7fc08a38ddfd',
        ram: 2048,
        setup: true,
        reserved: false,
        status: 'running',
        memory_total_bytes: 2147483648,
        memory_available_bytes: 1073741824,
        rack_identifier: 'ams-1',
        current_platform: '20121210T203034Z',
        sysinfo: {
            'Network Interfaces': {
                e1000g0: {
                    'Link Status': 'up',
                    'NIC Names': [ 'external' ]
                }
            }
        },
        traits: { true: 0 }
    };

    var data = {
        servers: server,
        vm: {
            ram: 768,
            owner_uuid: 'e1f0e74c-9f11-4d80-b6d1-74dcf1f5aafb'
        }
    };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.done();
    });
};
