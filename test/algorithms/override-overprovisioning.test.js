/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/override-overprovisioning.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.disableOverprovisioning =
function (t) {
    var givenServers = [
        { unreserved_cpu: 1                                    },
        { unreserved_cpu: 2, overprovision_ratios: {}          },
        { unreserved_cpu: 3, overprovision_ratios: { cpu:  1 } },
        { unreserved_cpu: 4, overprovision_ratios: { disk: 3 } }
    ];

    var expectedServers = [
        { unreserved_cpu: 1, overprovision_ratios: { cpu: 4, ram: 1, disk: 1} },
        { unreserved_cpu: 2, overprovision_ratios: { cpu: 4, ram: 1, disk: 1} },
        { unreserved_cpu: 3, overprovision_ratios: { cpu: 4, ram: 1, disk: 1} },
        { unreserved_cpu: 4, overprovision_ratios: { cpu: 4, ram: 1, disk: 1} }
    ];

    var pkg = {};
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, { pkg: pkg });

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(pkg, { overprovision_cpu: 4, overprovision_ram: 1,
                       overprovision_disk: 1 });

    pkg = { overprovision_cpu: 1, overprovision_ram: 2, overprovision_disk: 1,
            overprovision_io: 1, overprovision_net: 1 };

    filter.run(log, state, givenServers, { pkg: pkg });

    t.deepEqual(pkg, { overprovision_cpu: 4, overprovision_ram: 1,
                       overprovision_disk: 1 });

    t.done();
};



exports.disableOverprovisioning_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, [], { pkg: {} });

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
