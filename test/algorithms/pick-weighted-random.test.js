/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var picker = require('../../lib/algorithms/pick-weighted-random.js');

var log = { trace: function () {}, debug: function () {} };



exports.pickWeightedRandom_with_many_servers =
function (t) {
    var numServers = 100;
    var weightRatio = 0.2;
    var iterPerServer = 60;
    var selectedServerRange = numServers * weightRatio;

    var givenServers = [];
    for (var i = 0; i !== numServers; i++) {
        // note that we're just using 'index' here to keep track of which
        // server is which
        givenServers[i] = { index: i };
    }

    var pickedServers = [];

    var iterations = numServers * weightRatio * iterPerServer;
    for (i = 0; i != iterations; i++) {
        var servers = picker.run(log, givenServers);
        t.equal(servers.length, 1);

        var index = servers[0].index;
        pickedServers[index] = true;

        t.ok(index !== null);
        t.ok(index >= 0 && index <= selectedServerRange);
    }

    for (i = 0; i !== selectedServerRange; i++)
        t.ok(pickedServers[i]);

    for (i = selectedServerRange; i !== numServers; i++)
        t.ok(!pickedServers[i]);

    t.done();
};



exports.pickWeightedRandom_with_one_servers =
function (t) {
    var givenServers = [ { memory_available_bytes: 256 } ];

    for (var i = 0; i != 60; i++) {
        var pickedServers = picker.run(log, givenServers);
        t.equal(pickedServers.length, 1);
        t.deepEqual(pickedServers[0], givenServers[0]);
    }

    t.done();
};



exports.pickWeightedRandom_with_no_servers =
function (t) {
    for (var i = 0; i != 60; i++) {
        var pickedServers = picker.run(log, []);
        t.deepEqual(pickedServers, []);
    }

    t.done();
};
