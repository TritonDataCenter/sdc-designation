/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-min-ram.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterMinRam =
function (t) {
    var givenServers = [
        { unreserved_ram: 256 },
        { unreserved_ram: 511 },
        { unreserved_ram: 512 },
        { unreserved_ram: 768 }
    ];

    var expectedServers = givenServers.slice(2, 4);
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, 512);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterMinRam_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, [], 512);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
