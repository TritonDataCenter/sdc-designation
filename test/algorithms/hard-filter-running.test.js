/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-running.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterRunning =
function (t) {
    var givenServers = [
        { uuid: '2c86607e-7cdd-4d6b-a7db-16d91efe770c'                    },
        { uuid: '7ddf3e13-5386-41bd-96b9-a85825013d44', status: 'running' },
        { uuid: '242ef61f-2b26-42f1-a626-8ccf32738128', status: 'running' },
        { uuid: 'ac211712-34e6-45ac-b9e9-9165f6af3cfc', status: 'offline' }
    ];

    var expectedServers = givenServers.slice(1, 3);
    var state = {};
    var constraints = {};

    var results = filter.run(log, state, givenServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});
    var expectedReasons = {
        '2c86607e-7cdd-4d6b-a7db-16d91efe770c': 'Server status is undefined',
        'ac211712-34e6-45ac-b9e9-9165f6af3cfc': 'Server status is offline'
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterRunning_with_no_servers =
function (t) {
    var state = {};
    var servers = [];
    var constraints = {};

    var results = filter.run(log, state, servers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});
    t.deepEqual(reasons, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
