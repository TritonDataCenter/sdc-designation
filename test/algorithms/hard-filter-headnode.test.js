/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-headnode.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterHeadnode =
function (t) {
    var givenServers = [
        { memory_available_bytes: 256                  },
        { memory_available_bytes: 512, headnode: true  },
        { memory_available_bytes: 768, headnode: false }
    ];

    var expectedServers = [ givenServers[0], givenServers[2] ];
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterHeadnode_with_no_servers =
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
