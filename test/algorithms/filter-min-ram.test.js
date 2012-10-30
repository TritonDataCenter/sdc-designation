/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var filter = require('../../lib/algorithms/filter-min-ram.js');



exports.filterMinRam =
function (t) {
    var givenServers = [
        { memory_available_bytes: 256 * 1024 * 1024 },
        { memory_available_bytes: 511 * 1024 * 1024 },
        { memory_available_bytes: 512 * 1024 * 1024 },
        { memory_available_bytes: 768 * 1024 * 1024 }
    ];

    var expectedServers = givenServers.slice(2, 4);

    var filteredServers = filter.run(givenServers, 512);
    t.deepEqual(filteredServers, expectedServers);

    t.done();
};



exports.filterMinRam_with_no_servers =
function (t) {
    var filteredServers = filter.run([], 512);
    t.equal(filteredServers.length, 0);

    t.done();
};
