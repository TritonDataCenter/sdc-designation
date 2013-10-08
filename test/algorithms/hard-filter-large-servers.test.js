/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-large-servers.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



var givenServers = [];
for (var ii = 0; ii < 20; ii++)
    givenServers.push({ unreserved_ram: ii * 8 * 1024 });



exports.filterLargeServers =
function (t) {
    var expectedServers = givenServers.slice(0, givenServers.length - 3).
                                       reverse();
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterLargeServers_with_no_servers =
function (t) {
    var state = {};
    var ram = 34 * 1024;  // for vm, in MiB

    var filteredServers = filter.run(log, state, [], { vm: { ram: ram } });

    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
