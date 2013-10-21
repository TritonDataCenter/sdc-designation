/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-owner-same-racks.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterSameRacks =
function (t) {
    var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';

    var givenServers = [
        // rack 'foo'
        {
            uuid: 'e28724d2-cef0-4bcb-b549-33b479464bb9',
            rack_identifier: 'foo',
            vms: {
                '36951518-79bc-4434-a3ff-b2e75979db7c': {
                    owner_uuid: '4389962c-e5f7-4bd9-a59a-684cdeb5c352'
                },
                '4a097e67-f1f5-4dbf-9a3c-fb7530526d85': {
                    owner_uuid: '9504253d-7af3-476a-9681-f72ab54ab961'
                },
                'e0f62893-99cb-4186-acee-0a36ab1a5a08': {
                    owner_uuid: 'fe4896ad-e63d-46df-ba3f-a3f83fa49f70'
                }
            }
        },
        {
            uuid: '7f6b2cee-34a0-41fa-a2b2-bb6bdfea3031',
            rack_identifier: 'foo',
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
            uuid: 'b1c3c15b-b42e-408c-a55d-7ef0cc20a74b',
            rack_identifier: 'foo',
            vms: {
                '4abcf271-8112-433a-9816-1853e4f736b0': {
                    owner_uuid: 'a39034a7-c197-416c-9aa4-77f475a9ff8a'
                },
                'd4a83cdb-d33c-4c8c-9eed-7053567083b9': {
                    owner_uuid: owner_uuid
                },
                '50c28740-6119-41b7-a11c-519f66090f69': {
                    owner_uuid: owner_uuid
                }
            }
        },

        // rack 'bar'
        {
            uuid: '626f74d3-c163-4b5d-96e4-e89e8d63e3b5',
            rack_identifier: 'bar',
            vms: {
                'a4adac79-09cf-43bc-b0ec-23223613f4b6': {
                    owner_uuid: 'e99e2272-d939-4a4b-8cd7-ae21946f841f'
                },
                '29d41139-765c-4c23-ac14-8f4553510150': {
                    owner_uuid: 'b7095802-219c-4abd-a5a8-15e9024ec49d'
                },
                'edc92bd9-6f70-4680-827f-0c64685096b8': {
                    owner_uuid: 'f6903fc8-9ba1-4e2e-aea7-c570b0ac37f9'
                }
            }
        },
        {
            uuid: 'b32e3df0-3bbf-43fe-9bac-4cc44c002f4d',
            rack_identifier: 'bar',
            vms: {
                '15f6662a-2527-470d-befc-7f6aa3f7e7be': {
                    owner_uuid: '2b8a3715-8efc-4b36-9c0d-0126d7cc5315'
                },
                'e90b3ee9-6b82-4567-b843-9ce9bacfcb9a': {
                    // no owner_uuid
                    // owner_uuid: '8bab3b55-74f2-4ffd-9a65-ddcc069c226b'
                },
                '8555077c-45b5-4a19-81e9-01f60850b0fe': {
                    owner_uuid: 'a14008bc-b9bc-479e-8733-0821f86209ef'
                }
            }
        },
        {
            uuid: 'c3a90614-de39-4615-b6f1-ccea0e0789e0',
            rack_identifier: 'bar',
            vms: {
                '0bcc1dcc-daeb-4834-a2c7-9a48369e87d9': {
                    owner_uuid: 'f89d76ab-14fa-41f4-afd7-cad81991e738'
                },
                '3f73cf22-dfaa-4d6e-a14d-666ff1d4a171': {
                    owner_uuid: '9d9810ed-60c8-4c9d-ad75-42c1736465ba'
                },
                '7f52b79b-6996-464a-81d7-e6f00257ee7d': {
                    owner_uuid: '5ad8fdca-7fca-4198-911b-81f549ffeb06'
                }
            }
        },

        // rack 'baz'
        {
            uuid: '39668421-e19a-417c-87d3-e906d85dc612',
            rack_identifier: 'baz',
            vms: {
                'e9a61ca8-f64b-46e2-a061-2bb11a6c157b': {
                    owner_uuid: '38e8fa78-bc54-4ecb-91f6-473d6cb4594f'
                },
                '15e901a0-e783-4c2f-bac6-d5fe8c75367c': {
                    owner_uuid: '2e0ca8ef-be0e-441b-9bca-6ee2c0e591f4'
                },
                '5b9a6de8-f0c5-4c4f-a2f4-e9a699fc1f0b': {
                    owner_uuid: 'b7246416-e5a8-4215-a517-7e591be2801f'
                }
            }
        },
        {
            uuid: '81439554-d5f6-42f8-8f95-9db1c9b51239',
            rack_identifier: 'baz',
            vms: {
                'dcbf1fd2-35f2-4f2d-9e94-1b384b7b5837': {
                    owner_uuid: owner_uuid
                },
                '87a2cc81-696e-407d-981a-365427a70dc5': {
                    owner_uuid: '7765c51d-a032-466f-a418-4b080140f513'
                },
                'a12080cf-f35e-4e14-964f-88bb3c11211a': {
                    owner_uuid: 'ec3399e2-20de-4386-9019-72767f4b12a8'
                }
            }
        },
        {
            uuid: '017ee385-529c-450d-b059-fb72f9433b9d',
            rack_identifier: 'baz',
            vms: {
                '548150e8-cf71-413e-be91-8c738f372a00': {
                    owner_uuid: 'b639d2ac-4b26-4087-914a-5523f240df1b'
                },
                '893abff9-3022-4fe8-b2d7-82efb7dd6815': {
                    owner_uuid: 'a12ffc16-e90b-4578-a96b-26ad81eb9fa0'
                },
                '7cc05cff-50e2-4d4d-82c8-9ff281bd11d2': {
                    owner_uuid: '9c0a59b1-5c16-44c4-9617-a038254331fd'
                }
            }
        }
    ];

    var expectedServers = givenServers.slice(3, 6);
    var state = {};
    var constraints = { vm: { owner_uuid: owner_uuid } };

    var results = filter.run(log, state, givenServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        'e28724d2-cef0-4bcb-b549-33b479464bb9':
            'VM\'s owner has another VM in rack foo',
        '7f6b2cee-34a0-41fa-a2b2-bb6bdfea3031':
            'VM\'s owner has another VM in rack foo',
        'b1c3c15b-b42e-408c-a55d-7ef0cc20a74b':
            'VM\'s owner has another VM in rack foo',
        '39668421-e19a-417c-87d3-e906d85dc612':
            'VM\'s owner has another VM in rack baz',
        '81439554-d5f6-42f8-8f95-9db1c9b51239':
            'VM\'s owner has another VM in rack baz',
        '017ee385-529c-450d-b059-fb72f9433b9d':
            'VM\'s owner has another VM in rack baz'
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterSameRacks_with_no_vms =
function (t) {
    var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
    var state = {};
    var givenServers = [
        {
            uuid: '626f74d3-c163-4b5d-96e4-e89e8d63e3b5',
            rack_identifier: 'bar'
        }
    ];
    var constraints = { vm: { owner_uuid: owner_uuid } };

    var results = filter.run(log, state, givenServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.equal(filteredServers.length, 1);
    t.deepEqual(state, {});
    t.deepEqual(reasons, {});

    t.done();
};



exports.filterSameRacks_with_no_servers =
function (t) {
    var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
    var state = {};
    var servers = [];
    var constraints = { vm: { owner_uuid: owner_uuid } };

    var results = filter.run(log, state, servers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});
    t.deepEqual(reasons, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
