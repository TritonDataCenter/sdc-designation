/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-running.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterRunning =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128                    },
        { memory_available_bytes: 256, status: 'running' },
        { memory_available_bytes: 512, status: 'running' },
        { memory_available_bytes: 768, status: 'offline' }
    ];

    var expectedServers = givenServers.slice(1, 3);
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterRunning_with_no_servers =
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
