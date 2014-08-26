/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * Warning: if you make any alterations to the state in any of the tests
 * here, make sure to modify the associated tests in
 * soft-filter-locality-hints.test.js. 'expected' in this file should match
 * 'state' in that one.
 */

var filter = require('../../lib/algorithms/calculate-locality.js');
var genUuid = require('node-uuid');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var ownerUuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';

exports.filter_default_locality_with_rack_free = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var vmDetails = { owner_uuid: ownerUuid };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 4]),
		nearRackUuids: {},
		farRackUuids: { r01: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
};

exports.filter_default_locality_with_no_rack_free = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 3) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 2) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var vmDetails = { owner_uuid: ownerUuid };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 2, 3, 4]),
		nearRackUuids: {},
		farRackUuids: { r01: true, r02: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
};

exports.filter_default_locality_with_no_rack_or_server_free = function (t)
{
	var servers = [
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 3) },
		{ uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 2) },
		{ uuid: genUuid(), vms: genVms(3, 2) }
	];

	var vmDetails = { owner_uuid: ownerUuid };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 1, 2, 3, 4]),
		nearRackUuids: {},
		farRackUuids: { r01: true, r02: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
};

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

	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [2]),
		nearRackUuids: {},
		farRackUuids: { r02: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
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
	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 2]),
		nearRackUuids: {},
		farRackUuids: { r01: true, r02: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
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
	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids: listServerUuids(servers, [0, 1, 2, 3, 4]),
		nearRackUuids: {},
		farRackUuids: { r01: true, r02: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
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
	var vmDetails = { owner_uuid: ownerUuid, locality: { near: near } };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: listServerUuids(servers, [0]),
		farServerUuids: {},
		nearRackUuids: { r01: true },
		farRackUuids: {},
		algorithms: ['near']
	};

	testState(t, vmDetails, servers, expected);
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
	var vmDetails = { owner_uuid: ownerUuid, locality: { near: near } };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: listServerUuids(servers, [0, 1]),
		farServerUuids: {},
		nearRackUuids: { r01: true },
		farRackUuids: {},
		algorithms: ['near']
	};

	testState(t, vmDetails, servers, expected);
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

	var nearOwnerVms = servers.slice(0, 3).map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var farOwnerVms = [servers[0], servers[2]].map(function (s) {
		return (s.vms);
	}).map(function (vms) {
		return (Object.keys(vms).filter(function (uuid) {
			return (vms[uuid].owner_uuid === ownerUuid);
		}));
	});

	var near = [].concat.apply([], nearOwnerVms);
	var far  = [].concat.apply([], farOwnerVms);
	var vmDetails = {
		owner_uuid: ownerUuid,
		locality: { near: near, far: far }
	};

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: listServerUuids(servers, [0, 1, 2]),
		farServerUuids:  listServerUuids(servers, [0, 2]),
		nearRackUuids: { r01: true, r02: true },
		farRackUuids:  { r01: true, r02: true },
		algorithms: ['far', 'near']
	};

	testState(t, vmDetails, servers, expected);
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

	var vmDetails = { owner_uuid: ownerUuid, locality: { far: far[0] } };

	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids:  listServerUuids(servers, [2]),
		nearRackUuids: {},
		farRackUuids:  { r02: true },
		algorithms: ['far']
	};

	testState(t, vmDetails, servers, expected);
};

exports.filter_with_no_servers = function (t)
{
	var expected = { locality: {} };
	expected.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids:  {},
		nearRackUuids: {},
		farRackUuids:  {},
		algorithms: []
	};

	var state = {};
	var constraints = { vm: { owner_uuid: ownerUuid } };
	var servers = [];
	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];
	t.deepEqual(state, expected);
	t.deepEqual(filteredServers, servers);
	t.deepEqual(reasons, undefined);

	state = {};
	constraints = {
		vm: { owner_uuid: ownerUuid,
		locality: { near: genUuid() } }
	};
	servers = [];
	results = filter.run(log, state, servers, constraints);
	filteredServers = results[0];
	reasons = results[1];

	t.deepEqual(state, expected);
	t.deepEqual(filteredServers, servers);
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.post_deletes_state = function (t)
{
	var state = { locality: {} };
	state.locality[ownerUuid] = {
		nearServerUuids: {},
		farServerUuids:  {},
		nearRackUuids: {},
		farRackUuids:  {},
		algorithms: []
	};

	filter.post(log, state, {}, [], { vm: { owner_uuid: genUuid() } });
	t.equal(Object.keys(state.locality[ownerUuid]).length, 5);

	filter.post(log, state, {}, [], { vm: { owner_uuid: ownerUuid } });
	t.deepEqual(state, { locality: {} });

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

	for (; i !== numVms + numOwnerVms; i++) {
		vms[genUuid()] = { owner_uuid: genUuid() };
	}

	return (vms);
}

function
testState(t, vmDetails, servers, expectedState)
{
	var state = {};
	var constraints = { vm: vmDetails };
	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(state, expectedState);
	t.deepEqual(filteredServers, servers);
	t.deepEqual(reasons, undefined);

	t.done();
}
