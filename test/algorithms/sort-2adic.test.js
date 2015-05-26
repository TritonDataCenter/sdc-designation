/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var sorter = require('../../lib/algorithms/sort-2adic.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var givenServers = [];


function
check(t, requestedRam, expectedRams)
{
	var state = {};
	var constraints = { vm: { ram: requestedRam } };

	var results = sorter.run(log, state, givenServers, constraints);
	var sortedServers = results[0];
	var reasons = results[1];

	var sortedRams = sortedServers.map(function (server) {
		var ram = server.unreserved_ram;
		t.ok(ram > 0);
		return (ram);
	});

	t.deepEqual(sortedRams, expectedRams);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.end();
}


test('setup', function (t) {
	/* 128MB to 256GB */
	for (var i = 6; i <= 28; i++) {
		var ram = Math.pow(2, i);
		var server = { unreserved_ram: ram };
		givenServers.push(server);
	}

	/* add some non-n^2 servers */
	givenServers.push({ unreserved_ram: 48 * 1024 });
	givenServers.push({ unreserved_ram: 192 * 1024 });
	givenServers.push({ unreserved_ram: 12 * 1024 });
	givenServers.push({ unreserved_ram: 80 * 1024 });
	givenServers.push({ unreserved_ram: 768 });

	t.end();
});


test('sort2adic() 256 RAM', function (t) {
	var expectedRams = [ 768, 256, 512, 1024, 2048, 12288, 4096, 8192,
	    49152, 81920, 16384, 32768, 196608, 65536, 131072, 262144,
	    524288, 1048576, 2097152, 4194304, 8388608, 16777216,
	    33554432, 67108864, 134217728, 268435456 ];

	check(t, 256, expectedRams);
});


test('sort2adic() 768 RAM', function (t) {
	var expectedRams = [ 268435456, 67108864, 16777216, 4194304, 1048576,
	    262144, 65536, 16384, 4096, 1024, 768, 81920,
	    134217728, 33554432, 8388608, 2097152, 524288,
	    131072, 32768, 8192, 2048, 12288, 49152, 196608];

	check(t, 768, expectedRams);
});


test('sort2adic() 1024 RAM', function (t) {
	var expectedRams = [ 1024, 2048, 12288, 4096, 8192, 49152, 81920, 16384,
	    32768, 196608, 65536, 131072, 262144, 524288, 1048576,
	    2097152, 4194304, 8388608, 16777216, 33554432,
	    67108864, 134217728, 268435456];

	check(t, 1024, expectedRams);
});


/*
 * TODO: we have a problem with 2adic representation here, where 49152, 65536
 * and 81920 all end up with values of 0.1.
 */
test('sort2adic() 49152 RAM', function (t) {
	var expectedRams = [ 268435456, 67108864, 16777216, 4194304, 1048576,
	    262144, 65536, 49152, 81920, 134217728, 33554432,
	    8388608, 2097152, 524288, 131072, 196608 ];

	check(t, 48 * 1024, expectedRams);
});


/*
 * TODO: we have a problem with 2adic representation here, where 65536 and 81920
 * both end up with values of 0.1.
 */
test('sort2adic() 65536 RAM', function (t) {
	var expectedRams = [ 196608, 65536, 81920, 131072, 262144, 524288,
	    1048576, 2097152, 4194304, 8388608, 16777216, 33554432,
	    67108864, 134217728, 268435456 ];

	check(t, 64 * 1024, expectedRams);
});


test('name', function (t) {
	t.equal(typeof (sorter.name), 'string');
	t.end();
});
