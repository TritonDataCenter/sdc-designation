/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-capness.js');
var common = require('./common.js');


var SERVERS = [ {
	uuid: 'cdfe84c4-f7cc-4104-bc24-45f786bce762',
	vms : {
		'e34f6924-59ba-4242-8633-4aad203d060f': {
			uuid: 'e34f6924-59ba-4242-8633-4aad203d060f',
			cpu_cap: 100
		},
		'6e539da3-e826-4590-9e00-f9665a6680a2': {
			uuid: '6e539da3-e826-4590-9e00-f9665a6680a2',
			cpu_cap: 300
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
			uuid: '56b0465c-97f6-46f1-8d13-e8d87a3de558',
			cpu_cap: 100
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
			uuid: 'acc16d76-42f6-414b-92ce-557e72663c58',
			cpu_cap: 400
		}
	}
}, {
	uuid: 'f0908343-5410-47b0-b6c4-b724ab4ffda5',
	vms : {}
} ];


var checkFilter = common.createPluginChecker(filter);


test('filterCapness() with package with cpu_cap', function (t) {
	var expectServers = [ SERVERS[0], SERVERS[4] ];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'49878ba3-e28e-48c6-83c7-21dca018e69b': 'VM c9e59c1c-555d-4646-8791-606ef9429d93 has no cpu_cap, while the package does',
  		'8564ad6c-bfbc-475e-8b53-46bee1058a58': 'VM 3c8ef669-4a79-4eaa-bb0b-1fd413328844 has no cpu_cap, while the package does',
  		'45808bd4-a66c-400f-b138-4ff3bdd76d4c': 'VM 7650edda-e451-4b51-8168-3dbbcf2e71c1 has no cpu_cap, while the package does'
		/* END JSSTYLED */
	};

	var opts = { vm: {}, pkg: { cpu_cap: 100 } };

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterCapness() with package without cpu_cap', function (t) {
	var expectServers = [ SERVERS[1], SERVERS[4] ];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'cdfe84c4-f7cc-4104-bc24-45f786bce762': 'VM e34f6924-59ba-4242-8633-4aad203d060f has a cpu_cap, while the package does not',
  		'8564ad6c-bfbc-475e-8b53-46bee1058a58': 'VM 56b0465c-97f6-46f1-8d13-e8d87a3de558 has a cpu_cap, while the package does not',
  		'45808bd4-a66c-400f-b138-4ff3bdd76d4c': 'VM acc16d76-42f6-414b-92ce-557e72663c58 has a cpu_cap, while the package does not'
		/* END JSSTYLED */
	};

	var opts = { vm: {}, pkg: {} };

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterCapness() with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};
	var opts = { vm: {}, pkg: {} };

	checkFilter(t, [], opts, expectServers, expectReasons);
});


test('filterCapness() with no pkg', function (t) {
	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
