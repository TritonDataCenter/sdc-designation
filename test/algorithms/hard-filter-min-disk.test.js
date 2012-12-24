/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-min-disk.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterMinDisk =
function (t) {
    var givenServers = [
        { unreserved_disk: 2560 },
        { unreserved_disk: 5110 },
        { unreserved_disk: 5120 },
        { unreserved_disk: 7680 }
    ];

    var expectedServers = givenServers.slice(2, 4);
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, null, 5120);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinDisk_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, [], null, 5120);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinDisk_with_no_disk =
function (t) {
    var givenServers = [
        { unreserved_disk: 2560 },
        { unreserved_disk: 5110 },
        { unreserved_disk: 5120 }
    ];

    var state = {};

    var filteredServers = filter.run(log, state, givenServers, null, null);

    t.deepEqual(filteredServers, givenServers);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
