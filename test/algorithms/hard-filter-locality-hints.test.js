/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

var genUuid = require('libuuid').create;
var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-locality-hints.js');
var common = require('./common.js');


// --- globals

var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var OWNER_UUID = 'b0bbbbbb-9172-4c58-964e-fe58a9989708';

// --- internal support stuff

function
genVms(numVms, numOwnerVms)
{
	var vms = {};

	var data = [];
	for (var i = 0; i !== numOwnerVms; i++) {
		data.push([genUuid(), { owner_uuid: OWNER_UUID }]);
	}
	for (i = 0; i !== numVms - numOwnerVms; i++) {
		data.push([genUuid(), { owner_uuid: genUuid() }]);
	}

	shuffleArray(data);
	for (i = 0; i < data.length; i++) {
		vms[data[i][0]] = data[i][1];
	}

	return (vms);
}


var checkFilter = common.createPluginChecker(filter, LOG);


/**
 * Randomize array element order in-place.
 * Using Fisher-Yates shuffle algorithm.
 *
 * Via http://stackoverflow.com/a/2450976
 */
function
shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return (array);
}

function randInt(min, max) {
	var num = (Math.floor(Math.random() * (max - min + 1)) + min);
	return (num);
}


// --- tests

test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});


test('no locality, no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};

	var constraints = { vm: { owner_uuid: OWNER_UUID } };

	checkFilter(t, [], constraints, expectServers, expectReasons);
});


test('locality, no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};

	var constraints = { vm: {
		owner_uuid: OWNER_UUID,
		locality: { near: '468994e6-d53d-c74c-8245-3273a86dc3d9' }
	}};

	checkFilter(t, [], constraints, expectServers, expectReasons);
});


test('locality scenario A', function (tt) {
	var servers = [
		{ hostname: 'cn0', uuid: 'cafe0000-14b6-8040-8d36-54a1e5ec2ef9',
			vms: genVms(3, 2) },
		// cn1 has no VMs owned by OWNER_UUID.
		{ hostname: 'cn1', uuid: 'cafe1111-14b6-8040-8d36-54a1e5ec2ef9',
			vms: genVms(3, 0) },
		{ hostname: 'cn2', uuid: 'cafe2222-14b6-8040-8d36-54a1e5ec2ef9',
			vms: genVms(3, 1) },
		{ hostname: 'cn3', uuid: 'cafe3333-14b6-8040-8d36-54a1e5ec2ef9',
			vms: genVms(3, 1) },
		{ hostname: 'cn4', uuid: 'cafe4444-14b6-8040-8d36-54a1e5ec2ef9',
			vms: genVms(3, 2) }
	];

	function ownerVmOnServer(idx) {
		return Object.keys(servers[idx].vms).filter(function (v) {
			return (servers[idx].vms[v].owner_uuid === OWNER_UUID);
		})[0];
	}
	function nonOwnerVmOnServer(idx) {
		return Object.keys(servers[idx].vms).filter(function (v) {
			return (servers[idx].vms[v].owner_uuid !== OWNER_UUID);
		})[0];
	}

	var ownerVmOnServer0 = ownerVmOnServer(0);
	var ownerVmOnServer3 = ownerVmOnServer(3);
	var ownerVmOnServer4 = ownerVmOnServer(4);
	var nonOwnerVmOnServer3 = nonOwnerVmOnServer(3);

	tt.test('  non-strict far', function (t) {
		var expServers = servers;
		var expReasons = { skip: 'No strict locality requested' };
		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { far: ownerVmOnServer0 }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict far (string)', function (t) {
		var expServers = [
			servers[1], servers[2], servers[3], servers[4]
		];

		var expReasons = {};
		expReasons[servers[0].uuid]
			= 'exclude: inst!=' + ownerVmOnServer0;

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			// test with 'far' as a string.
			locality: { strict: true, far: ownerVmOnServer0 }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict far (array)', function (t) {
		var expServers = [
			servers[1], servers[2], servers[3], servers[4]
		];

		var expReasons = {};
		expReasons[servers[0].uuid]
			= 'exclude: inst!=' + ownerVmOnServer0;

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			// test with 'far' as an array
			locality: { strict: true, far: [ownerVmOnServer0] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  non-strict near', function (t) {
		var expServers = servers;
		var expReasons = { skip: 'No strict locality requested' };

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: false, near: [ownerVmOnServer3] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict near', function (t) {
		var expServers = [servers[3]];
		var expReasons = {};
		expReasons[servers[3].uuid]
			= 'include: inst==' + ownerVmOnServer3;

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, near: [ownerVmOnServer3] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict near non-existent-VM', function (t) {
		var nonExistentVm = '9c6d1ace-3676-5c4f-9a83-55de5ddb4b55';

		var expServers = [];
		var expReasons =  { '*' : 'exclude: inst==' + nonExistentVm };

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, near: [nonExistentVm] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict far non-existent-VM', function (t) {
		var nonExistentVm = 'f795e38f-1fce-3a49-b6e9-a62f07a559fc';

		var expServers = servers;
		var expReasons = {};

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, far: [nonExistentVm] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict near, ignores non-owner VMs', function (t) {
		var expServers = [];
		var expReasons = {
			'*': 'exclude: inst==' + nonOwnerVmOnServer3
		};

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, near: [nonOwnerVmOnServer3] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict far, ignores non-owner VMs', function (t) {
		var expServers = servers;
		var expReasons = {};

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, far: [nonOwnerVmOnServer3] }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  strict near that filters out all servers', function (t) {
		var near = [ownerVmOnServer3, ownerVmOnServer4];

		var expServers = [];
		var expReasons = { '*': 'exclude: inst==' + near.join(',') };

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, near: near }
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});

	tt.test('  far and near', function (t) {
		var expServers = [servers[4]];

		var expReasons = {};
		expReasons[servers[4].uuid]
			= 'include: inst==' + ownerVmOnServer4;
		expReasons[servers[3].uuid]
			= 'exclude: inst!=' + ownerVmOnServer3;

		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: {
				strict: true,
				near: [ownerVmOnServer4],
				far: [ownerVmOnServer3]
			}
		} };

		checkFilter(t, servers, constraints, expServers, expReasons);
	});
});


test('locality scenario B: large set', function (tt) {
	var servers = [];
	// A 1000 CNs, each with 250 VMs.
	for (var i = 0; i < 1000; i++) {
		servers.push({
			hostname: 'cn' + i,
			uuid: 'cafe' + (1000 + i).toString()
				+ '-dfce-244e-8f98-0f80b53e8971',
			vms: genVms(250, randInt(1, 10))
		});
	}

	function ownerVmOnServer(idx) {
		return Object.keys(servers[idx].vms).filter(function (v) {
			return (servers[idx].vms[v].owner_uuid === OWNER_UUID);
		})[0];
	}
	function nonOwnerVmOnServer(idx) {
		return Object.keys(servers[idx].vms).filter(function (v) {
			return (servers[idx].vms[v].owner_uuid !== OWNER_UUID);
		})[0];
	}

	var ownerVmOnServer42 = ownerVmOnServer(42);
	var ownerVmOnServer997 = ownerVmOnServer(997);

	tt.test('  strict near', function (t) {
		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, near: [ownerVmOnServer997] }
		} };

		var start = Date.now();
		filter.run(LOG, servers, constraints,
				function (err, filteredServers, reasons) {
			t.ifError(err);

			var end = Date.now();
			var elapsed = end - start;

			t.equal(filteredServers.length, 1);
			t.ok(elapsed < 50, '<50ms elapsed: ' + elapsed + 'ms');

			t.end();
		});
	});

	tt.test('  strict far', function (t) {
		var constraints = { vm: {
			owner_uuid: OWNER_UUID,
			locality: { strict: true, far: [
				ownerVmOnServer42, ownerVmOnServer997] }
		} };

		var start = Date.now();
		filter.run(LOG, servers, constraints,
				function (err, filteredServers, reasons) {
			t.ifError(err);

			var end = Date.now();
			var elapsed = end - start;

			t.equal(filteredServers.length, 998);
			t.ok(elapsed < 50, '<50ms elapsed: ' + elapsed + 'ms');

			t.end();
		});
	});
});
