/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-min-ram.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterMinRam =
function (t) {
    var givenServers = [
        { unreserved_ram: 256, overprovision_ratios: {}           },
        { unreserved_ram: 511, overprovision_ratios: {}           },
        { unreserved_ram: 512, overprovision_ratios: { ram: 1.0 } },
        { unreserved_ram: 768, overprovision_ratios: { ram: 1.0 } }
    ];

    var expectedServers = givenServers.slice(0, 2);
    var state = {};

    var constraints = { vm: { ram: 512 }, pkg: {} };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinRam_with_overprovision_ratios =
function (t) {
    var givenServers = [
        { unreserved_ram: 256, overprovision_ratios: { ram: 1.0 } },
        { unreserved_ram: 511, overprovision_ratios: { ram: 1.0 } },
        { unreserved_ram: 512, overprovision_ratios: { ram: 1.0 } },
        { unreserved_ram: 768, overprovision_ratios: { ram: 1.0 } }
    ];

    var expectedServers = givenServers.slice(2, 4);
    var state = {};

    var constraints = { vm: { ram: 768 }, pkg: { overprovision_ram: 1.5 } };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinRam_with_no_servers =
function (t) {
    var state = {};

    var constraints = { vm: { ram: 512 }, pkg: { overprovision_ram: 1.0 } };
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
