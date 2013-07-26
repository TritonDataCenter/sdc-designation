/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/' +
                     'hard-filter-overprovision-ratios.js');
var uuid   = require('node-uuid');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterOverprovisionRatios =
function (t) {
    var givenServers = [
        { uuid: uuid(), overprovision_ratios: { ram: 1.0   } },
        { uuid: uuid(), overprovision_ratios: { ram: 1.01  } },
        { uuid: uuid(), overprovision_ratios: { ram: 1.001 } },
        { uuid: uuid(), overprovision_ratios: { ram: 2.0   } },
        { uuid: uuid(), overprovision_ratios: { ram: 1.5   } },
        { uuid: uuid(), overprovision_ratios: { ram: 10.0  } },
        { uuid: uuid(), overprovision_ratios: { ram: 1.0   } },
        { uuid: uuid(), overprovision_ratios: { ram: 0.999 } },
        { uuid: uuid(), overprovision_ratios: { ram: 0.99  } },
        { uuid: uuid(), overprovision_ratios: { ram: 1.0   } }
    ];

    var state = {};

    var pkg = { overprovision_ram: 1.0 };
    var expectedServers = [ givenServers[0], givenServers[2],
                            givenServers[6], givenServers[7],
                            givenServers[9] ];
    var filteredServers = filter.run(log, state, givenServers, {}, {}, pkg);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    pkg = { overprovision_ram: 1.5 };
    expectedServers = givenServers.slice(4, 5);
    filteredServers = filter.run(log, state, givenServers, {}, {}, pkg);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterOverprovisionRatios_with_no_servers =
function (t) {
    var pkg = { overprovision_ram: 1.0 };
    var state = {};

    var filteredServers = filter.run(log, state, [], {}, {}, pkg);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
