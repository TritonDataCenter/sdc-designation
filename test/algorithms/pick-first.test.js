/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var picker = require('../../lib/algorithms/pick-first.js');



exports.pickFirst =
function (t) {
    var givenServers = [
        { memory_available_bytes: 256 },
        { memory_available_bytes: 768 },
        { memory_available_bytes: 512 }
    ];

    var expectedServer = { memory_available_bytes: 256 };

    var pickedServer = picker.run(givenServers);
    t.deepEqual(pickedServer, expectedServer);

    t.done();
};



exports.pickFirst_with_no_servers =
function (t) {
    var pickedServer = picker.run([]);
    t.equal(pickedServer, null);

    t.done();
};
