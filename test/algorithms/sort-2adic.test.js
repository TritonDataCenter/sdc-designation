/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var sorter = require('../../lib/algorithms/sort-2adic.js');

var log = { trace: function () {}, debug: function () {} };

var givenServers = [];



function init() {
    // 128MB to 256GB
    for (var i = 6; i <= 28; i++) {
        var ram = Math.pow(2, i) * 1024 * 1024;
        var server = { memory_available_bytes: ram };
        givenServers.push(server);
    }

    // add some non-n^2 servers
    givenServers.push({ memory_available_bytes:  48 * 1024 * 1024 * 1024 });
    givenServers.push({ memory_available_bytes: 192 * 1024 * 1024 * 1024 });
    givenServers.push({ memory_available_bytes:  12 * 1024 * 1024 * 1024 });
    givenServers.push({ memory_available_bytes:  80 * 1024 * 1024 * 1024 });
    givenServers.push({ memory_available_bytes:        768 * 1024 * 1024 });
}



function check(t, requestedRam, expectedRams) {
    var state = {};
    var sortedServers = sorter.run(log, state, givenServers, requestedRam);

    var sortedRams = sortedServers.map(function (server) {
        var ram = server.memory_available_bytes;
        t.ok(ram > 0);
        return ram / 1024 / 1024;
    });

    t.deepEqual(sortedRams, expectedRams);
    t.deepEqual(state, {});

    t.done();
}



init();



exports.sort2adic_256ram =
function (t) {
    var expectedRams = [ 768, 256, 512, 1024, 2048, 12288, 4096, 8192, 49152,
                         81920, 16384, 32768, 196608, 65536, 131072, 262144,
                         524288, 1048576, 2097152, 4194304, 8388608, 16777216,
                         33554432, 67108864, 134217728, 268435456 ];

    check(t, 256, expectedRams);

};



exports.sort2adic_768ram =
function (t) {
    var expectedRams = [ 268435456, 67108864, 16777216, 4194304, 1048576,
                         262144, 65536, 16384, 4096, 1024, 768, 81920,
                         134217728, 33554432, 8388608, 2097152, 524288,
                         131072, 32768, 8192, 2048, 12288, 49152, 196608];

    check(t, 768, expectedRams);
};



exports.sort2adic_1024ram =
function (t) {
    var expectedRams = [ 1024, 2048, 12288, 4096, 8192, 49152, 81920, 16384,
                         32768, 196608, 65536, 131072, 262144, 524288, 1048576,
                         2097152, 4194304, 8388608, 16777216, 33554432,
                         67108864, 134217728, 268435456];

    check(t, 1024, expectedRams);
};



// TODO: we have a problem with 2adic representation here, where 49152, 65536
// and 81920 all end up with values of 0.1.
exports.sort2adic_49152ram =
function (t) {
    var expectedRams = [ 268435456, 67108864, 16777216, 4194304, 1048576,
                         262144, 65536, 49152, 81920, 134217728, 33554432,
                         8388608, 2097152, 524288, 131072, 196608 ];

    check(t, 48 * 1024, expectedRams);
};



// TODO: we have a problem with 2adic representation here, where 65536 and 81920
// both end up with values of 0.1.
exports.sort2adic_65536ram =
function (t) {
    var expectedRams = [ 196608, 65536, 81920, 131072, 262144, 524288, 1048576,
                         2097152, 4194304, 8388608, 16777216, 33554432,
                         67108864, 134217728, 268435456 ];

    check(t, 64 * 1024, expectedRams);
};



exports.name =
function (t) {
    t.ok(typeof (sorter.name) === 'string');
    t.done();
};
