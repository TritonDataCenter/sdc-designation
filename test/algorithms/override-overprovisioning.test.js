/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/override-overprovisioning.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('disable overprovisioning', function (t) {
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

	var pkg = {};
	var constraints = { pkg: pkg, defaults: {} };

	var results = filter.run(log, givenServers, constraints);
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
	constraints = { pkg: pkg, defaults: {} };

	filter.run(log, givenServers, constraints);

	t.deepEqual(pkg, {
		overprovision_cpu: 4,
		overprovision_ram: 1,
		overprovision_disk: 1
	});

	t.end();
});


test('disable overprovisioning without pkg', function (t) {
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

	var constraints = { defaults: {} };

	var results = filter.run(log, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(reasons, undefined);

	t.end();
});


test('disable overprovisioning with disable_override_overprovisioning',
function (t) {
	var givenServers = [
		{ unreserved_cpu: 1 },
		{ unreserved_cpu: 2, overprovision_ratios: {} },
		{ unreserved_cpu: 3, overprovision_ratios: { cpu:  1 } },
		{ unreserved_cpu: 4, overprovision_ratios: { disk: 3 } }
	];

	// deep copy
	var expectedServers = JSON.parse(JSON.stringify(givenServers));

	var pkg = {};
	var constraints = { pkg: pkg, defaults: {
		disable_override_overprovisioning: true
	} };

	var results = filter.run(log, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(pkg, {});
	t.deepEqual(reasons, undefined);

	t.end();
});


test('disable overprovisioning with override_overprovision_*', function (t) {
	var givenServers = [
		{ unreserved_cpu: 1 },
		{ unreserved_cpu: 2, overprovision_ratios: {} },
		{ unreserved_cpu: 3, overprovision_ratios: { cpu:  1 } },
		{ unreserved_cpu: 4, overprovision_ratios: { disk: 3 } }
	];

	var expectedServers = [
		{
			unreserved_cpu: 1,
			overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
		},
		{
			unreserved_cpu: 2,
			overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
		},
		{
			unreserved_cpu: 3,
			overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
		},
		{
			unreserved_cpu: 4,
			overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
		}
	];

	var pkg = {};
	var constraints = { pkg: pkg, defaults: {
		overprovision_ratio_cpu: 6,
		overprovision_ratio_ram: 0.75,
		overprovision_ratio_disk: 0.5
	} };

	var results = filter.run(log, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(pkg, {
		overprovision_cpu: 6,
		overprovision_ram: 0.75,
		overprovision_disk: 0.5
	});
	t.deepEqual(reasons, undefined);

	pkg = {
		overprovision_cpu: 1,
		overprovision_ram: 2,
		overprovision_disk: 1,
		overprovision_io: 1,
		overprovision_net: 1
	};
	constraints = { pkg: pkg, defaults: {
		overprovision_ratio_cpu: 6,
		overprovision_ratio_ram: 0.75,
		overprovision_ratio_disk: 0.5
	} };

	filter.run(log, givenServers, constraints);

	t.deepEqual(pkg, {
		overprovision_cpu: 6,
		overprovision_ram: 0.75,
		overprovision_disk: 0.5
	});

	t.end();
});


test('disable overprovisioning without pkg', function (t) {
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

	var constraints = { defaults: {} };

	var results = filter.run(log, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(reasons, undefined);

	t.end();
});


test('disable overprovisioning with no servers', function (t) {
	var servers = [];
	var constraints = { pkg: {}, defaults: {} };

	var results = filter.run(log, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(reasons, undefined);

	t.end();
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
