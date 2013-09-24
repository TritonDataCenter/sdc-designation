/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-reservoir.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterReservoir =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, reservoir: false   },
        { memory_available_bytes: 384                     },
        { memory_available_bytes: 768, reservoir: true    }
    ];

    var expectedServers = givenServers.slice(0, 2);
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterReservoir_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, []);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
