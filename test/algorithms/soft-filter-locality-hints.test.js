/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Warning: if you make any alterations to the state in any of the tests
 * here, make sure to modify the associated tests in calculate-locality.test.js.
 * 'expected' in that file should match 'state' in this one.
 */

var filter = require('../../lib/algorithms/soft-filter-locality-hints.js');
var genUuid = require('node-uuid');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var ownerUuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';

exports.filter_far_locality_with_rack_free = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var vms = servers[2].vms;
	var far = Object.keys(vms).filter(function (uuid) {
		return (vms[uuid].owner_uuid === ownerUuid);
	});

	var expected = servers.slice(0, 2);
	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [2]),
		nearRackUuids: {},
		farRackUuids: { r02: true },
		algorithms: ['far']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_far_locality_with_no_rack_free = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var ownerVms = [servers[0], servers[2]].map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var far = [].concat.apply([], ownerVms);

	var expected = [servers[1], servers[3], servers[4]];
	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 2]),
		nearRackUuids: {},
		farRackUuids: { r01: true, r02: true },
		algorithms: ['far']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_far_locality_with_no_rack_or_server_free = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var ownerVms = servers.map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var far = [].concat.apply([], ownerVms);

	var expected = servers;
	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 1, 2, 3, 4]),
		nearRackUuids: {},
		farRackUuids: { r01: true, r02: true },
		algorithms: ['far']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_near_locality_with_free_server_in_rack = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var ownerVms = servers.slice(0, 1).map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var near = [].concat.apply([], ownerVms);

	var expected = servers.slice(1, 2);
	var vmDetails = { owner_uuid: ownerUuid, locality: { near: near } };

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: listServerUuids(servers, [0]),
		farServerUuids: {},
		nearRackUuids: { r01: true },
		farRackUuids: {},
		algorithms: ['near']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_near_locality_with_no_free_servers_in_rack = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var ownerVms = servers.slice(0, 2).map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var near = [].concat.apply([], ownerVms);

	var expected = servers.slice(0, 2);
	var vmDetails = { owner_uuid: ownerUuid, locality: { near: near } };

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: listServerUuids(servers, [0, 1]),
		farServerUuids: {},
		nearRackUuids: { r01: true },
		farRackUuids: {},
		algorithms: ['near']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_locality_near_and_far = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var ownerVms = servers.slice(0, 3).map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var near = [].concat.apply([], ownerVms);

	ownerVms = [servers[0], servers[2]].map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var far = [].concat.apply([], ownerVms);

	var expected = servers.slice(3, 4);
	var vmDetails = {
		owner_uuid: ownerUuid,
		locality: { near: near, far: far }
	};

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: listServerUuids(servers, [0, 1, 2]),
		farServerUuids:  listServerUuids(servers, [0, 2]),
		nearRackUuids: { r01: true, r02: true },
		farRackUuids:  { r01: true, r02: true },
		algorithms: ['far', 'near']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_locality_with_strings = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var vms = servers[2].vms;
	var far = Object.keys(vms).filter(function (uuid) {
		return (vms[uuid].owner_uuid === ownerUuid);
	});

	var expected = servers.slice(0, 2);
	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far[0] } };

	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids:  listServerUuids(servers, [2]),
		nearRackUuids: {},
		farRackUuids:  { r02: true },
		algorithms: ['far']
	};

	filterServers(t, state, vmDetails, servers, expected);
};

exports.filter_with_no_servers = function (t)
{
	var state = { locality: {} };
	var servers = [];
	state.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids:  {},
		nearRackUuids: {},
		farRackUuids:  {},
		algorithms: []
	};
	var origState = deepCopy(state);

	var constraints = { vm: { owner_uuid: ownerUuid } };
	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];
	t.equal(filteredServers.length, 0);
	t.deepEqual(state, origState);
	t.deepEqual(reasons, undefined);

	constraints = {
		vm: { owner_uuid: ownerUuid, locality: { near: genUuid() } }
	};
	results = filter.run(log, state, servers, constraints);
	filteredServers = results[0];
	reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, origState);
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};

function
listServerUuids(servers, indexes)
{
	var uuids = {};

	indexes.forEach(function (i) {
		var uuid = servers[i].uuid;
		uuids[uuid] = true;
	});

	return (uuids);
}

function
genVms(numVms, numOwnerVms)
{
	var vms = {};

	for (var i = 0; i !== numOwnerVms; i++) {
		vms[genUuid()] = { owner_uuid: ownerUuid };
	}

	for (i = 0; i !== numVms - numOwnerVms; i++) {
		vms[genUuid()] = { owner_uuid: genUuid() };
	}

	return (vms);
}

function
sortServers(servers)
{
	return (servers.sort(function (a, b) {
		return (a.uuid > b.uuid ? 1 : -1);
	}));
}

function
filterServers(t, state, vmDetails, servers, expectedServers)
{
	var origState = deepCopy(state);
	var results = filter.run(log, state, servers, { vm: vmDetails });
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(sortServers(filteredServers), sortServers(expectedServers));
	t.deepEqual(state, origState);
	t.deepEqual(reasons, undefined);

	t.done();
}

/*
 * Deep copies a an object. This method assumes an acyclic graph.
 */
function deepCopy(obj) {
	var type = typeof (obj);

	if (type == 'object') {
		if (obj === null)
			return (null);

	var clone;
	if (obj instanceof Buffer) {
		clone = new Buffer(obj);

		/* XXX for some reason obj instanceof Array doesn't work here */
		} else if (typeof (obj.length) == 'number') {
			clone = [];
			for (var i = obj.length - 1; i >= 0; i--) {
				clone[i] = deepCopy(obj[i]);
			}

		} else {
			clone = {};
			for (i in obj) {
				clone[i] = deepCopy(obj[i]);
			}
		}

		return (clone);

	} else if (type == 'string') {
		return ('' + obj);
	} else {
		return (obj);
	}
}
