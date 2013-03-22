/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-overprovision-ratio.js');
var uuid   = require('node-uuid');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterOverprovisionRatio =
function (t) {
    var givenServers = [
        { uuid: uuid(), overprovision_ratio: 1.0   },
        { uuid: uuid(), overprovision_ratio: 1.01  },
        { uuid: uuid(), overprovision_ratio: 1.001 },
        { uuid: uuid(), overprovision_ratio: 2.0   },
        { uuid: uuid(), overprovision_ratio: 1.5   },
        { uuid: uuid(), overprovision_ratio: 10.0  },
        { uuid: uuid(), overprovision_ratio: 1.0   },
        { uuid: uuid(), overprovision_ratio: 0.999 },
        { uuid: uuid(), overprovision_ratio: 0.99  },
        { uuid: uuid()                             }
    ];

    var state = {};

    var vm = {};
    var expectedServers = [ givenServers[0], givenServers[2],
                            givenServers[6], givenServers[7],
                            givenServers[9] ];
    var filteredServers = filter.run(log, state, givenServers, vm);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    vm = { overprovision_ratio: 1.0 };
    filteredServers = filter.run(log, state, givenServers, vm);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    vm = { overprovision_ratio: 1.5 };
    expectedServers = givenServers.slice(4, 5);
    filteredServers = filter.run(log, state, givenServers, vm);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterOverprovisionRatio_with_no_servers =
function (t) {
    var vm = { overprovision_ratio: 1.0 };
    var state = {};

    var filteredServers = filter.run(log, state, [], vm);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
