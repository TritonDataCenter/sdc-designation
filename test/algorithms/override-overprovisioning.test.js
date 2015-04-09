/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/override-overprovisioning.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.disableOverprovisioning = function (t)
{
	var givenServers = [
		{ unreserved_cpu: 1 },
		{ unreserved_cpu: 2, overprovision_ratios: {} },
		{ unreserved_cpu: 3, overprovision_ratios: { cpu:  1 } },
		{ unreserved_cpu: 4, overprovision_ratios: { disk: 3 } }
	];

	var expectedServers = [
		{
			unreserved_cpu: 1,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		},
		{
			unreserved_cpu: 2,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		},
		{
			unreserved_cpu: 3,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		},
		{
			unreserved_cpu: 4,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		}
	];

	var state = {};
	var pkg = {};
	var constraints = { pkg: pkg };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(pkg, {
		overprovision_cpu: 4,
		overprovision_ram: 1,
		overprovision_disk: 1
	});
	t.deepEqual(reasons, undefined);

	pkg = {
		overprovision_cpu: 1,
		overprovision_ram: 2,
		overprovision_disk: 1,
		overprovision_io: 1,
		overprovision_net: 1
	};
	constraints = { pkg: pkg };

	filter.run(log, state, givenServers, constraints);

	t.deepEqual(pkg, {
		overprovision_cpu: 4,
		overprovision_ram: 1,
		overprovision_disk: 1
	});

	t.done();
};

exports.disableOverprovisioning_without_pkg = function (t)
{
	var givenServers = [
		{ unreserved_cpu: 1 },
		{ unreserved_cpu: 2, overprovision_ratios: {} },
		{ unreserved_cpu: 3, overprovision_ratios: { cpu:  1 } },
		{ unreserved_cpu: 4, overprovision_ratios: { disk: 3 } }
	];

	var expectedServers = [
		{
			unreserved_cpu: 1,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		},
		{
			unreserved_cpu: 2,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		},
		{
			unreserved_cpu: 3,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		},
		{
			unreserved_cpu: 4,
			overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
		}
	];

	var state = {};

	var results = filter.run(log, state, givenServers, {});
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.disableOverprovisioning_with_no_servers = function (t)
{
	var state = {};
	var servers = [];
	var constraints = { pkg: {} };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, undefined);

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
