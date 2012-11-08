/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var sorter = require('../../lib/algorithms/sort-ram.js');

var log = { trace: function () {}, debug: function () {} };



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

    var state = {};

    var sortedServers = sorter.run(log, state, givenServers);

    t.deepEqual(sortedServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (sorter.name) === 'string');
    t.done();
};
