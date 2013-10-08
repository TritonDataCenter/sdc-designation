/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-min-cpu.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterMinCpu =
function (t) {
    var givenServers = [
        { unreserved_cpu: 400, overprovision_ratios: {}           },
        { unreserved_cpu: 590, overprovision_ratios: {}           },
        { unreserved_cpu: 610, overprovision_ratios: { cpu: 1.0 } },
        { unreserved_cpu: 900, overprovision_ratios: { cpu: 1.0 } }
    ];

    var expectedServers = givenServers.slice(0, 2);
    var state = {};

    var constraints = { vm: { cpu_cap: 900 }, img: {}, pkg: {} };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinCpu_with_overprovision_ratios =
function (t) {
    var givenServers = [
        { unreserved_cpu: 400, overprovision_ratios: { cpu: 1.0 } },
        { unreserved_cpu: 590, overprovision_ratios: { cpu: 1.0 } },
        { unreserved_cpu: 610, overprovision_ratios: { cpu: 1.0 } },
        { unreserved_cpu: 900, overprovision_ratios: { cpu: 1.0 } }
    ];

    var expectedServers = givenServers.slice(2, 4);
    var state = {};

    var constraints = { vm:  { cpu_cap: 900 },
                        img: {},
                        pkg: { overprovision_cpu: 1.5 } };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinCpu_with_no_servers =
function (t) {
    var state = {};

    var constraints = { vm: { cpu_cap: 900 }, img: {}, pkg: {} };
    var filteredServers = filter.run(log, state, [], constraints);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinCpu_with_no_cpu =
function (t) {
    var givenServers = [
        { unreserved_cpu: 400, overprovision_ratios: { cpu: 1.0 } },
        { unreserved_cpu: 600, overprovision_ratios: { cpu: 1.0 } },
        { unreserved_cpu: 650, overprovision_ratios: { cpu: 1.0 } }
    ];

    var state = {};

    var constraints = { vm: {}, img: {}, pkg: {} };
    var filteredServers = filter.run(log, state, givenServers, constraints);

    t.deepEqual(filteredServers, givenServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinCpu_with_no_servers =
function (t) {
    var state = {};

    var constraints = { vm:  { cpu_cap: 900 },
                        img: {},
                        pkg: { overprovision_cpu: 1.0 } };
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
