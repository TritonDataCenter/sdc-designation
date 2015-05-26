/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/' +
    'hard-filter-overprovision-ratios.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var givenServers = [
	{
		uuid: '98b6985f-f102-4c4f-a2e3-eda731a8b0dc',
		overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: 'f8d517d8-80a3-47e3-a108-b9e4b6f8556a',
		overprovision_ratios: { ram: 1.01 }
	}, {
		uuid: '5f8fb9e8-dd2f-47a3-a9d1-339299ca9dbc',
		overprovision_ratios: { ram: 1.001 }
	}, {
		uuid: 'd71a3405-25e1-46d0-8906-ad4ffadb00fb',
		overprovision_ratios: { ram: 2.0 }
	}, {
		uuid: 'f06f9f6c-5b9c-4019-8f54-402b7a15946d',
		overprovision_ratios: { ram: 1.5 }
	}, {
		uuid: '0ab1eaeb-5825-4b43-bd71-b5c4e90f9912',
		overprovision_ratios: { ram: 10.0 }
	}, {
		uuid: '6e5dad5e-0ee6-44db-a21e-90f99d89a9c7',
		overprovision_ratios: { ram: 1.0 }
	}, {
		uuid: '00b614e3-9017-428a-8dec-490326d8b42b',
		overprovision_ratios: { ram: 0.999 }
	}, {
		uuid: 'cfac7af7-22d4-4f85-af3b-ce35c1c41f92',
		overprovision_ratios: { ram: 0.99 }
	}, {
		uuid: '1ce9c2d4-f9ef-436f-81d8-d233a970cd99',
		overprovision_ratios: { ram: 1.0 }
	}
];


test('filterOverprovisionRatios()', function (t) {
	var results;
	var reasons;
	var constraints;
	var filteredServers;
	var expectedServers;
	var expectedReasons;
	var state = {};

	expectedServers = [ givenServers[0], givenServers[2], givenServers[6],
	    givenServers[7], givenServers[9] ];
	constraints = { pkg: { overprovision_ram: 1.0 } };
	results = filter.run(log, state, givenServers, constraints);
	filteredServers = results[0];
	reasons = results[1];
	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	expectedReasons = {
		/* BEGIN JSSTYLED */
		'f8d517d8-80a3-47e3-a108-b9e4b6f8556a': 'Package over-provision ratio of 1.00 does not match server\'s 1.01',
		'd71a3405-25e1-46d0-8906-ad4ffadb00fb': 'Package over-provision ratio of 1.00 does not match server\'s 2.00',
		'f06f9f6c-5b9c-4019-8f54-402b7a15946d': 'Package over-provision ratio of 1.00 does not match server\'s 1.50',
		'0ab1eaeb-5825-4b43-bd71-b5c4e90f9912': 'Package over-provision ratio of 1.00 does not match server\'s 10.00',
		'cfac7af7-22d4-4f85-af3b-ce35c1c41f92': 'Package over-provision ratio of 1.00 does not match server\'s 0.99'
		/* END JSSTYLED */
	};
	t.deepEqual(reasons, expectedReasons);

	constraints = { pkg: { overprovision_ram: 1.5 } };
	expectedServers = givenServers.slice(4, 5);
	results = filter.run(log, state, givenServers, constraints);
	filteredServers = results[0];
	reasons = results[1];
	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	expectedReasons = {
		/* BEGIN JSSTYLED */
		'98b6985f-f102-4c4f-a2e3-eda731a8b0dc': 'Package over-provision ratio of 1.50 does not match server\'s 1.00',
		'f8d517d8-80a3-47e3-a108-b9e4b6f8556a': 'Package over-provision ratio of 1.50 does not match server\'s 1.01',
		'5f8fb9e8-dd2f-47a3-a9d1-339299ca9dbc': 'Package over-provision ratio of 1.50 does not match server\'s 1.00',
		'd71a3405-25e1-46d0-8906-ad4ffadb00fb': 'Package over-provision ratio of 1.50 does not match server\'s 2.00',
		'0ab1eaeb-5825-4b43-bd71-b5c4e90f9912': 'Package over-provision ratio of 1.50 does not match server\'s 10.00',
		'6e5dad5e-0ee6-44db-a21e-90f99d89a9c7': 'Package over-provision ratio of 1.50 does not match server\'s 1.00',
		'00b614e3-9017-428a-8dec-490326d8b42b': 'Package over-provision ratio of 1.50 does not match server\'s 1.00',
		'cfac7af7-22d4-4f85-af3b-ce35c1c41f92': 'Package over-provision ratio of 1.50 does not match server\'s 0.99',
		'1ce9c2d4-f9ef-436f-81d8-d233a970cd99': 'Package over-provision ratio of 1.50 does not match server\'s 1.00'
		/* END JSSTYLED */
	};
	t.deepEqual(reasons, expectedReasons);

	t.end();
});


test('filterOverprovisionRatios() without pkg', function (t) {
	var state = {};
	var constraints = {};

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];

	t.deepEqual(filteredServers, givenServers);
	t.deepEqual(state, {});

	t.end();
});


test('filterOverprovisionRatios() with no servers', function (t) {
	var state = {};
	var servers = [];
	var constraints = { pkg: { overprovision_ram: 1.0 } };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
