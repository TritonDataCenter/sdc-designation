/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var identity = require('../../lib/algorithms/identity.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.identity =
function (t) {
    var givenServers = [
        { unreserved_ram: 256 },
        { unreserved_ram: 511 },
        { unreserved_ram: 512 },
        { unreserved_ram: 768 }
    ];

    var state = {};

    var servers = identity.run(log, state, givenServers);

    t.deepEqual(servers, givenServers);
    t.deepEqual(state, {});

    t.done();
};



exports.identity_with_no_servers =
function (t) {
    var state = {};

    var servers = identity.run(log, state, []);

    t.equal(servers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (identity.name) === 'string');
    t.done();
};
