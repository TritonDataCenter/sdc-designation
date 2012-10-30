/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var filter = require('../../lib/algorithms/filter-setup.js');



exports.filterSetup =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128               },
        { memory_available_bytes: 256, setup: true  },
        { memory_available_bytes: 512, setup: false },
        { memory_available_bytes: 768, setup: true  }
    ];

    var expectedServers = [ givenServers[1], givenServers[3] ];

    var filteredServers = filter.run(givenServers);
    t.deepEqual(filteredServers, expectedServers);

    t.done();
};



exports.filterSetup_with_no_servers =
function (t) {
    var filteredServers = filter.run([]);
    t.equal(filteredServers.length, 0);

    t.done();
};
