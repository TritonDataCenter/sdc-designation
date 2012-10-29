/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var sorter = require('../../lib/algorithms/sort-ram.js');



exports.sortRam =
function (t) {
    var givenServers = [
        { memory_available_bytes: 256 },
        { memory_available_bytes: 768 },
        { memory_available_bytes: 512 }
    ];

    var expectedServers = [
        { memory_available_bytes: 768 },
        { memory_available_bytes: 512 },
        { memory_available_bytes: 256 }
    ];

    var sortedServers = sorter.run(givenServers);
    t.deepEqual(sortedServers, expectedServers);

    t.done();
};
