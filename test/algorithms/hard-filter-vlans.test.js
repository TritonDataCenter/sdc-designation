/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var filter = require('../../lib/algorithms/hard-filter-vlans.js');

var log = { trace: function () {}, debug: function () {} };

var servers = [
    {
        uuid: '564d9386-8c67-b674-587f-101f1db2eda7',
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
        }
    },
    {
        uuid: 'f5e4e5f9-75e6-43e8-a016-a85835b377e1',
        sysinfo: {
            'Network Interfaces': {
                e1000g0: {
                    'Link Status': 'down',
                    'NIC Names': [ 'external' ]
                },
                e1000g1: {
                   'Link Status': 'up',
                   'NIC Names': [ 'admin' ]
                }
            }
        }
    },
    {
        uuid: '97b466d7-465d-4c22-b26e-a6707a22390e',
        sysinfo: {
            'Network Interfaces': {
                e1000g0: {
                    'Link Status': 'up',
                    'NIC Names': [ 'external', 'customer12' ]
                },
                e1000g1: {
                   'Link Status': 'up',
                   'NIC Names': [ 'admin' ]
                }
            }
        }
    }
];



function test(t, vlans, expectedUuids) {
    var filteredServers = filter.run(log, servers, null, vlans);
    var serverUuids = filteredServers.map(function (s) { return s.uuid; });

    t.deepEqual(serverUuids.sort(), expectedUuids);
}



exports.filterVlans_on_single_vlan =
function (t) {
    var expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
                          '97b466d7-465d-4c22-b26e-a6707a22390e' ];
    test(t, ['external'], expectedUuids);

    expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
                      '97b466d7-465d-4c22-b26e-a6707a22390e',
                      'f5e4e5f9-75e6-43e8-a016-a85835b377e1' ];
    test(t, ['admin'], expectedUuids);

    expectedUuids = [ '97b466d7-465d-4c22-b26e-a6707a22390e' ];
    test(t, ['customer12'], expectedUuids);

    expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
                      '97b466d7-465d-4c22-b26e-a6707a22390e',
                      'f5e4e5f9-75e6-43e8-a016-a85835b377e1' ];
    test(t, [], expectedUuids);

    test(t, ['doesnotexist'], []);

    t.done();
};



exports.filterVlans_on_multiple_vlans =
function (t) {
    var expectedUuids = [ '564d9386-8c67-b674-587f-101f1db2eda7',
                          '97b466d7-465d-4c22-b26e-a6707a22390e' ];
    test(t, ['external', 'admin'], expectedUuids);
    test(t, ['admin', 'external'], expectedUuids);

    expectedUuids = [ '97b466d7-465d-4c22-b26e-a6707a22390e' ];
    test(t, ['customer12', 'admin', 'external'], expectedUuids);

    test(t, ['admin', 'doesnotexist'], []);

    t.done();
};



exports.filterVlans_with_no_servers =
function (t) {
    var filteredServers = filter.run(log, [], null, ['admin']);
    t.equal(filteredServers.length, 0);

    t.done();
};
