/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-min-disk.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterMinDisk =
function (t) {
    var givenServers = [
        { unreserved_disk: 2560, overprovision_ratios: {}            },
        { unreserved_disk: 5110, overprovision_ratios: {}            },
        { unreserved_disk: 5120, overprovision_ratios: { disk: 1.0 } },
        { unreserved_disk: 7680, overprovision_ratios: { disk: 1.0 } }
    ];

    var expectedServers = givenServers.slice(0, 2);
    var vm = { quota: 5120 };
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, vm, {}, {});

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinDisk_with_overprovision_ratios =
function (t) {
    var givenServers = [
        { unreserved_disk: 2560, overprovision_ratios: { disk: 1.0 } },
        { unreserved_disk: 5110, overprovision_ratios: { disk: 1.0 } },
        { unreserved_disk: 5120, overprovision_ratios: { disk: 1.0 } },
        { unreserved_disk: 7680, overprovision_ratios: { disk: 1.0 } }
    ];

    var expectedServers = givenServers.slice(2, 4);
    var vm = { quota: 7680 };
    var pkg = { overprovision_disk: 1.5 };
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, vm, {}, pkg);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinDisk_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, [], { quota: 5120 }, {}, {});

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinDisk_with_no_disk =
function (t) {
    var givenServers = [
        { unreserved_disk: 2560, overprovision_ratios: { disk: 1.0 } },
        { unreserved_disk: 5110, overprovision_ratios: { disk: 1.0 } },
        { unreserved_disk: 5120, overprovision_ratios: { disk: 1.0 } }
    ];

    var state = {};

    var filteredServers = filter.run(log, state, givenServers, {}, {}, {});

    t.deepEqual(filteredServers, givenServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinDisk_with_no_servers =
function (t) {
    var vm = { quota: 5120 };
    var pkg = { overprovision_disk: 1.0 };
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
