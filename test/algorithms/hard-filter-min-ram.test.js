/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-min-ram.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.filterMinRam = function (t)
{
	var givenServers = [
		{
			uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
			unreserved_ram: 256, overprovision_ratios: {}
		},
		{
			uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
			unreserved_ram: 511, overprovision_ratios: {}
		},
		{
			uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
			unreserved_ram: 512,
			overprovision_ratios: { ram: 1.0 }
		},
		{
			uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
			unreserved_ram: 768,
			overprovision_ratios: { ram: 1.0 }
		}
	];

	var expectedServers = givenServers.slice(0, 2);
	var state = {};
	var constraints = { vm: { ram: 512 }, pkg: {} };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'7a8c759c-2a82-4d9b-bed4-7049b71197cb':
		    'Package gave no RAM overprovision ratio, ' +
		    'but server has ratio 1',
		'f60f7e40-2e92-47b8-8686-1b46a85dd35f':
		    'Package gave no RAM overprovision ratio, ' +
		    'but server has ratio 1'
	};
	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.filterMinRam_with_overprovision_ratios = function (t)
{
	var givenServers = [
		{
			uuid: 'f667e0fa-33db-48da-a5d0-9fe837ce93fc',
			unreserved_ram: 256, overprovision_ratios: { ram: 1.0 }
		},
		{
			uuid: '4fe12d99-f013-4983-9e39-6e2f35b37aec',
			unreserved_ram: 511, overprovision_ratios: { ram: 1.0 }
		},
		{
			uuid: '7a8c759c-2a82-4d9b-bed4-7049b71197cb',
			unreserved_ram: 512, overprovision_ratios: { ram: 1.0 }
		},
		{
			uuid: 'f60f7e40-2e92-47b8-8686-1b46a85dd35f',
			unreserved_ram: 768, overprovision_ratios: { ram: 1.0 }
		}
	];

	var expectedServers = givenServers.slice(2, 4);
	var state = {};
	var constraints = { vm: { ram: 768 }, pkg: { overprovision_ram: 1.5 } };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'f667e0fa-33db-48da-a5d0-9fe837ce93fc':
		    'VM\'s calculated 512 RAM is less than server\'s spare 256',
		'4fe12d99-f013-4983-9e39-6e2f35b37aec':
		    'VM\'s calculated 512 RAM is less than server\'s spare 511'
	};
	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.filterMinRam_with_no_servers = function (t)
{
	var state = {};
	var servers = [];
	var constraints = { vm: { ram: 512 }, pkg: { overprovision_ram: 1.0 } };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
