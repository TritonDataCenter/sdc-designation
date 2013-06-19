/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var uuid = require('node-uuid');
var filter = require('../../lib/algorithms/soft-filter-recent-servers.js');



var log = { trace: function () { return true; },
            debug: function () { return true; } };

var givenServers = [];
for (var ii = 0; ii < 12; ii++) {
    givenServers.push({ uuid: uuid() });
}



exports.filterRecentServers_no_prior_servers =
function (t) {
    var expectedServers = givenServers;
    var state = {};

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, { recent_servers: {} });

    t.done();
};



exports.filterRecentServers_some_prior_servers =
function (t) {
    var now = +new Date();
    var expectedServers  = givenServers.slice(0, 11);
    var oldServerUuid    = givenServers[11].uuid;
    var tooOldServerUuid = givenServers[10].uuid;

    var state = { recent_servers: {} };
    state.recent_servers[oldServerUuid   ] = now - 4 * 60 * 1000;
    state.recent_servers[tooOldServerUuid] = now - 6 * 60 * 6000;

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(Object.keys(state), ['recent_servers']);
    t.deepEqual(Object.keys(state.recent_servers), [oldServerUuid]);
    t.equal(state.recent_servers[oldServerUuid], now - 4 * 60 * 1000);

    t.done();
};



exports.filterRecentServers_more_prior_servers =
function (t) {
    var now = +new Date();
    var expectedServers = givenServers.slice(3, givenServers.length);

    var state = { recent_servers: {} };
    for (var i = 0; i !== givenServers.length - 1; i++) {
        var serverUuid = givenServers[i].uuid;
        var timestamp  = now - (i + 0.5) * 60 * 1000;
        state.recent_servers[serverUuid] = timestamp;
    }

    var filteredServers = filter.run(log, state, givenServers);

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(Object.keys(state), ['recent_servers']);

    t.equal(Object.keys(state.recent_servers).length, 5);
    for (i = 0; i < 5; i++) {
        serverUuid = givenServers[i].uuid;
        timestamp  = now - (i + 0.5) * 60 * 1000;
        t.deepEqual(state.recent_servers[serverUuid], timestamp);
    }

    t.done();
};



exports.filterRecentServers_with_no_prior_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, []);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, { recent_servers: {} });

    t.done();
};



exports.post =
function (t) {
    var server = givenServers[0];
    var state  = { recent_servers: {} };
    var now    = +new Date();

    filter.post(log, state, server);

    t.equal(Object.keys(state.recent_servers).length, 1);
    t.ok(state.recent_servers[server.uuid] >= now);

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
