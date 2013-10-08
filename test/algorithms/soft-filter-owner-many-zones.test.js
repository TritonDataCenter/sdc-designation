/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/soft-filter-owner-many-zones.js');
var uuid = require('node-uuid');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterManyZones_many =
function (t) {
    var ownerUuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';

    var givenServers = [
        { uuid: uuid(), vms: genVms(13, 10, ownerUuid) },
        { uuid: uuid(), vms: genVms(20, 8,  ownerUuid) },
        { uuid: uuid(), vms: genVms(16, 15, ownerUuid) },
        { uuid: uuid(), vms: genVms(15, 4,  ownerUuid) },
        { uuid: uuid(), vms: genVms(2,  1,  ownerUuid) },
        { uuid: uuid(), vms: genVms(4,  2,  ownerUuid) },
        { uuid: uuid(), vms: genVms(1,  0,  ownerUuid) },
        { uuid: uuid(), vms: genVms(14, 11, ownerUuid) },
        { uuid: uuid(), vms: genVms(16, 3,  ownerUuid) },
        { uuid: uuid(), vms: genVms(9,  2,  ownerUuid) },
        { uuid: uuid(), vms: genVms(12, 10, ownerUuid) },
        { uuid: uuid(), vms: genVms(21, 2,  ownerUuid) },
        { uuid: uuid(), vms: genVms(1,  1,  ownerUuid) },
        { uuid: uuid(), vms: genVms(14, 10, ownerUuid) },
        { uuid: uuid(), vms: genVms(10, 9,  ownerUuid) },
        { uuid: uuid(), vms: genVms(0,  0,  ownerUuid) },
        { uuid: uuid(), vms: genVms(2,  1,  ownerUuid) },
        { uuid: uuid(), vms: genVms(24, 20, ownerUuid) },
        { uuid: uuid(), vms: genVms(4,  3,  ownerUuid) },
        { uuid: uuid(), vms: genVms(3,  2,  ownerUuid) }
    ];

    var expectedServers = [ givenServers[4],  givenServers[6],
                            givenServers[12], givenServers[15],
                            givenServers[16] ];
    var state = {};

    var constraints = { vm: { owner_uuid: ownerUuid } };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(sortServers(filteredServers), sortServers(expectedServers));
    t.deepEqual(state, {});

    t.done();
};



exports.filterManyZones_few =
function (t) {
    var ownerUuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';

    var givenServers = [
        {
            vms: {
                '36951518-79bc-4434-a3ff-b2e75979db7c': {
                    owner_uuid: ownerUuid
                },
                '4a097e67-f1f5-4dbf-9a3c-fb7530526d85': {
                    owner_uuid: '9504253d-7af3-476a-9681-f72ab54ab96'
                },
                'e0f62893-99cb-4186-acee-0a36ab1a5a08': {
                    owner_uuid: 'fe4896ad-e63d-46df-ba3f-a3f83fa49f70'
                }
            }
        },
        {
            vms: {
                '6e8c34e2-275d-4009-8431-417f9fb24229': {
                    owner_uuid: '0fe96be3-5b2c-4e54-8a25-3805f45cab26'
                },
                'b4f62751-9d6e-4c54-b38f-a5ace16aa44f': {
                    owner_uuid: '7abc989a-257d-4eb4-884f-e7e36787b385'
                },
                'bd44011c-7daf-4bb3-aeda-520094d50a4b': {
                    owner_uuid: '7f3daf93-e6cd-4bdb-8f47-507acbedad7c'
                }
            }

        },
        {
            vms: {
                '4abcf271-8112-433a-9816-1853e4f736b0': {
                    owner_uuid: 'a39034a7-c197-416c-9aa4-77f475a9ff8a'
                },
                'd4a83cdb-d33c-4c8c-9eed-7053567083b9': {
                    owner_uuid: '4389962c-e5f7-4bd9-a59a-684cdeb5c352'
                },
                '50c28740-6119-41b7-a11c-519f66090f69': {
                    owner_uuid: ownerUuid
                }
            }
        }
    ];

    var expectedServers = [ givenServers[1] ];
    var state = {};

    var constraints = { vm: { owner_uuid: ownerUuid } };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterManyZones_with_no_servers =
function (t) {
    var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
    var state = {};

    var constraints = { vm: { owner_uuid: owner_uuid } };
    var filteredServers = filter.run(log, state, [], constraints);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};



function genVms(numVms, numOwnerVms, ownerUuid) {
    var vms = {};

    for (var i = 0; i !== numOwnerVms; i++) {
        vms[uuid()] = { owner_uuid: ownerUuid };
    }

    for (i = 0; i !== numVms - numOwnerVms; i++) {
        vms[uuid()] = { owner_uuid: uuid() };
    }

    return vms;
}



function sortServers(servers) {
    return servers.sort(function (a, b) {
        return (a.uuid > b.uuid ? 1 : -1);  // assuming server UUIDs are unique
    });
}