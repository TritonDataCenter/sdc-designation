/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var test = require('tape');
var loader = require('../../lib/algorithms/load-server-vms.js');
var common = require('./common.js');


var SERVERS = [
	{ uuid: 'cdfe84c4-f7cc-4104-bc24-45f786bce762' },
	{ uuid: '49878ba3-e28e-48c6-83c7-21dca018e69b' },
	{ uuid: '8564ad6c-bfbc-475e-8b53-46bee1058a58' },
	{ uuid: '45808bd4-a66c-400f-b138-4ff3bdd76d4c' },
	{ uuid: 'f0908343-5410-47b0-b6c4-b724ab4ffda5' },
	{ uuid: '00000000-0000-0000-0000-0000deadbeef' }
];


var checkPlugin = common.createPluginChecker(loader);


test('loadServerVms() with getServerVms set', function (t) {
	var vmLookup = {
		'cdfe84c4-f7cc-4104-bc24-45f786bce762': [
			{ uuid: 'e34f6924-59ba-4242-8633-4aad203d060f' },
			{ uuid: '6e539da3-e826-4590-9e00-f9665a6680a2' }
		],
		'49878ba3-e28e-48c6-83c7-21dca018e69b': [
			{ uuid: 'c9e59c1c-555d-4646-8791-606ef9429d93' },
			{ uuid: '2f7eac77-0e97-42d7-a024-7db370ca5110' }
		],
		'8564ad6c-bfbc-475e-8b53-46bee1058a58': [
			{ uuid: '56b0465c-97f6-46f1-8d13-e8d87a3de558' },
			{ uuid: '3c8ef669-4a79-4eaa-bb0b-1fd413328844' }
		],
		'45808bd4-a66c-400f-b138-4ff3bdd76d4c': [
			{ uuid: '7650edda-e451-4b51-8168-3dbbcf2e71c1' },
			{ uuid: 'acc16d76-42f6-414b-92ce-557e72663c58' }
		]
	};

	common.OPTS.getServerVms = function (serverUuid, cb) {
		if (serverUuid === '00000000-0000-0000-0000-0000deadbeef') {
			var err = new Error('test error');
			return (cb(err));
		}

		return (cb(null, vmLookup[serverUuid] || []));
	};

	var expectServers = [ {
		uuid: 'cdfe84c4-f7cc-4104-bc24-45f786bce762',
		vms : {
			'e34f6924-59ba-4242-8633-4aad203d060f': {
				uuid: 'e34f6924-59ba-4242-8633-4aad203d060f'
			},
			'6e539da3-e826-4590-9e00-f9665a6680a2': {
				uuid: '6e539da3-e826-4590-9e00-f9665a6680a2'
			}
		}
	}, {
		uuid: '49878ba3-e28e-48c6-83c7-21dca018e69b',
		vms : {
			'c9e59c1c-555d-4646-8791-606ef9429d93': {
				uuid: 'c9e59c1c-555d-4646-8791-606ef9429d93'
			},
			'2f7eac77-0e97-42d7-a024-7db370ca5110': {
				uuid: '2f7eac77-0e97-42d7-a024-7db370ca5110'
			}
		}
	}, {
		uuid: '8564ad6c-bfbc-475e-8b53-46bee1058a58',
		vms : {
			'56b0465c-97f6-46f1-8d13-e8d87a3de558': {
				uuid: '56b0465c-97f6-46f1-8d13-e8d87a3de558'
			},
			'3c8ef669-4a79-4eaa-bb0b-1fd413328844': {
				uuid: '3c8ef669-4a79-4eaa-bb0b-1fd413328844'
			}
		}
	}, {
		uuid: '45808bd4-a66c-400f-b138-4ff3bdd76d4c',
		vms : {
			'7650edda-e451-4b51-8168-3dbbcf2e71c1': {
				uuid: '7650edda-e451-4b51-8168-3dbbcf2e71c1'
			},
			'acc16d76-42f6-414b-92ce-557e72663c58': {
				uuid: 'acc16d76-42f6-414b-92ce-557e72663c58'
			}
		}
	}, {
		uuid: 'f0908343-5410-47b0-b6c4-b724ab4ffda5',
		vms : {}
	} ];

	var expectReasons = {
		'cdfe84c4-f7cc-4104-bc24-45f786bce762': '2 VMs loaded',
		'49878ba3-e28e-48c6-83c7-21dca018e69b': '2 VMs loaded',
		'8564ad6c-bfbc-475e-8b53-46bee1058a58': '2 VMs loaded',
		'45808bd4-a66c-400f-b138-4ff3bdd76d4c': '2 VMs loaded',
		'f0908343-5410-47b0-b6c4-b724ab4ffda5': '0 VMs loaded',
		'00000000-0000-0000-0000-0000deadbeef':
			'Error loading VMs: test error'
	};

	checkPlugin(t, SERVERS, {}, expectServers, expectReasons);
});


test('loadServerVms() with no servers', function (t) {
	checkPlugin(t, [], {}, [], {});
});


test('loadServerVms() without getServerVms set', function (t) {
	delete common.OPTS.getServerVms;

	var expectReasons = {
		skip: 'getServerVms not set; assuming server.vms is already ' +
			'populated'
	};

	checkPlugin(t, SERVERS, {}, SERVERS, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (loader.name), 'string');
	t.end();
});
