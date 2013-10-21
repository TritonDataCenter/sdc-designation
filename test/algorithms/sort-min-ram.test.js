/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var sorter = require('../../lib/algorithms/sort-min-ram.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.sortMinRam =
function (t) {
    var givenServers = [
        { unreserved_ram: 256 },
        { unreserved_ram: 768 },
        { unreserved_ram: 512 }
    ];

    var expectedServers = [
        { unreserved_ram: 256 },
        { unreserved_ram: 512 },
        { unreserved_ram: 768 }
    ];

    var state = {};
    var constraints = {};

    var results = sorter.run(log, state, givenServers, constraints);
    var sortedServers = results[0];
    var reasons = results[1];

    t.deepEqual(sortedServers, expectedServers);
    t.deepEqual(state, {});
    t.deepEqual(reasons, undefined);

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (sorter.name) === 'string');
    t.done();
};
