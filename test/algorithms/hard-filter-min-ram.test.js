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
    var vm = { ram: 512 };
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, vm, {}, {});

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
    var vm = { ram: 768 };
    var pkg = { overprovision_ram: 1.5 };
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, vm, {}, pkg);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinRam_with_no_servers =
function (t) {
    var vm = { ram: 512 };
    var pkg = { overprovision_ram: 1.0 };
    var state = {};

    var filteredServers = filter.run(log, state, [], vm, {}, pkg);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
