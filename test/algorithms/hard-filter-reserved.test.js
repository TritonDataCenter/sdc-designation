/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-reserved.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterReserved =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, reserved: false   },
        { memory_available_bytes: 256, reserved: 'true'  },
        { memory_available_bytes: 384                    },
        { memory_available_bytes: 512, reserved: 'false' },
        { memory_available_bytes: 768, reserved: true    }
    ];

    var expectedServers = [ givenServers[0], givenServers[3] ];
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterReserved_with_no_servers =
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
