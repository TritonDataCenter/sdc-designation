/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var filter = require('../../lib/algorithms/filter-running.js');



exports.filterRunning =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128                    },
        { memory_available_bytes: 256, status: 'running' },
        { memory_available_bytes: 512, status: 'running' },
        { memory_available_bytes: 768, status: 'offline' }
    ];

    var expectedServers = givenServers.slice(1, 3);

    var filteredServers = filter.run(givenServers);
    t.deepEqual(filteredServers, expectedServers);

    t.done();
};



exports.filterRunning_with_no_servers =
function (t) {
    var filteredServers = filter.run([]);
    t.equal(filteredServers.length, 0);

    t.done();
};
