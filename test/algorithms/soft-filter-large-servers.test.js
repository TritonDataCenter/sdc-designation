/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/soft-filter-large-servers.js');

var log = { trace: function () {}, debug: function () {} };



var givenServers = [];
for (var ii = 0; ii < 20; ii++)
    givenServers.push({ unreserved_ram: ii * 8 * 1024 });



exports.filterLargeServers_with_small_allocation =
function (t) {
    var expectedServers = givenServers.slice(3, givenServers.length);
    var state = {};
    var ram = 30 * 1024;  // for vm, in MiB

    var filteredServers = filter.run(log, state, givenServers, { ram: ram });

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers.reverse(),
                                 { ram: ram });

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterLargeServers_with_large_allocation =
function (t) {
    var expectedServers = givenServers.slice(0, 3);
    var state = {};
    var ram = 34 * 1024;  // for vm, in MiB

    var filteredServers = filter.run(log, state, givenServers, { ram: ram });

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers.reverse(),
                                 { ram: ram });

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterLargeServers_with_few_servers =
function (t) {
    var servers = givenServers.slice(0, 3);
    var state = {};
    var ram = 34 * 1024;  // for vm, in MiB

    var filteredServers = filter.run(log, state, servers, { ram: ram });

    t.deepEqual(filteredServers, servers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterLargeServers_with_no_servers =
function (t) {
    var state = {};
    var ram = 34 * 1024;  // for vm, in MiB

    var filteredServers = filter.run(log, state, [], { ram: ram });

    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
