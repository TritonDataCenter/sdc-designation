/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var picker = require('../../lib/algorithms/pick-random.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.pickRandom =
function (t) {
    var givenServers = [
        { memory_available_bytes: 256 },
        { memory_available_bytes: 768 },
        { memory_available_bytes: 512 }
    ];

    var constraints = {};
    var pickedServers = [];

    for (var i = 0; i != 60; i++) {
        var state = {};

        var results = picker.run(log, state, givenServers, constraints);
        var server = results[0][0];
        var reasons = results[1];

        var ram = server.memory_available_bytes;
        pickedServers[ram] = true;
        t.ok(ram === 256 || ram === 512 || ram === 768);
        t.deepEqual(state, {});
        t.deepEqual(reasons, undefined);

    }

    t.ok(pickedServers[256] && pickedServers[512] && pickedServers[768]);

    t.done();
};



exports.pickRandom_with_no_servers =
function (t) {
    var servers = [];
    var constraints = {};

    for (var i = 0; i != 5; i++) {
        var state = {};

        var results = picker.run(log, state, servers, constraints);
        var pickedServers = results[0];
        var reasons = results[1];

        t.deepEqual(pickedServers, []);
        t.deepEqual(state, {});
        t.deepEqual(reasons, undefined);
    }

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (picker.name) === 'string');
    t.done();
};
