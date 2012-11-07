/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-setup.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterSetup =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128               },
        { memory_available_bytes: 256, setup: true  },
        { memory_available_bytes: 512, setup: false },
        { memory_available_bytes: 768, setup: true  }
    ];

    var expectedServers = [ givenServers[1], givenServers[3] ];
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterSetup_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, []);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};
