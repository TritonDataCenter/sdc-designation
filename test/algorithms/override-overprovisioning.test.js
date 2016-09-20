/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var assert = require('assert-plus');
var test = require('tape');
var plugin = require('../../lib/algorithms/override-overprovisioning.js');
var common = require('./common.js');


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var SERVERS = [
	{ unreserved_cpu: 1 },
	{ unreserved_cpu: 2, overprovision_ratios: {} },
	{ unreserved_cpu: 3, overprovision_ratios: { cpu:  1 } },
	{ unreserved_cpu: 4, overprovision_ratios: { disk: 3 } }
];

var EXPECT_SERVERS = [ {
	unreserved_cpu: 1,
	overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
}, {
	unreserved_cpu: 2,
	overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
}, {
	unreserved_cpu: 3,
	overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
}, {
	unreserved_cpu: 4,
	overprovision_ratios: { cpu: 4, ram: 1, disk: 1 }
} ];

var EXPECT_REASONS = {};


test('disable overprovisioning 1', function (t) {
	var pkg = {};
	var constraints = { pkg: pkg, defaults: {} };

	plugin.run(LOG, SERVERS, constraints,
			function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, EXPECT_SERVERS);
		t.deepEqual(reasons, EXPECT_REASONS);

		t.deepEqual(pkg, {
			overprovision_cpu: 4,
			overprovision_ram: 1,
			overprovision_disk: 1
		});

		t.end();
	});
});


test('disable overprovisioning 2', function (t) {
	var pkg = {
		overprovision_cpu: 1,
		overprovision_ram: 2,
		overprovision_disk: 1,
		overprovision_io: 1,
		overprovision_net: 1
	};

	var constraints = { pkg: pkg, defaults: {} };

	plugin.run(LOG, SERVERS, constraints,
			function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, EXPECT_SERVERS);
		t.deepEqual(reasons, EXPECT_REASONS);

		t.deepEqual(pkg, {
			overprovision_cpu: 4,
			overprovision_ram: 1,
			overprovision_disk: 1
		});

		t.end();
	});
});


test('disable overprovisioning without pkg', function (t) {
	var constraints = { defaults: {} };
	var expectConstraints = common.clone(constraints);
	var expectReasons = {};

	plugin.run(LOG, SERVERS, constraints,
			function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, EXPECT_SERVERS);
		t.deepEqual(reasons, expectReasons);

		// just checking pkg attr wasn't added
		t.deepEqual(constraints, expectConstraints);

		t.end();
	});
});


test('disable overprovisioning with disable_override_overprovisioning',
function (t) {
	// deep copy
	var expectServers = JSON.parse(JSON.stringify(SERVERS));
	var expectReasons = {
		skip: 'Do not override overprovisioning numbers'
	};

	var pkg = {};
	var constraints = { pkg: pkg, defaults: {
		disable_override_overprovisioning: true
	} };

	plugin.run(LOG, SERVERS, constraints,
			function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, expectServers);
		t.deepEqual(reasons, expectReasons);

		t.deepEqual(pkg, {});

		t.end();
	});
});


test('disable overprovisioning with override_overprovision_* 1', function (t) {
	var expectServers = [ {
		unreserved_cpu: 1,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	}, {
		unreserved_cpu: 2,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	}, {
		unreserved_cpu: 3,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	}, {
		unreserved_cpu: 4,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	} ];

	var pkg = {};
	var constraints = { pkg: pkg, defaults: {
		overprovision_ratio_cpu: 6,
		overprovision_ratio_ram: 0.75,
		overprovision_ratio_disk: 0.5
	} };

	plugin.run(LOG, SERVERS, constraints,
			function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, expectServers);
		t.deepEqual(reasons, EXPECT_REASONS);

		t.deepEqual(pkg, {
			overprovision_cpu: 6,
			overprovision_ram: 0.75,
			overprovision_disk: 0.5
		});

		t.end();
	});
});


test('disable overprovisioning with override_overprovision_* 2', function (t) {
	var expectServers = [ {
		unreserved_cpu: 1,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	}, {
		unreserved_cpu: 2,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	}, {
		unreserved_cpu: 3,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	}, {
		unreserved_cpu: 4,
		overprovision_ratios: { cpu: 6, ram: 0.75, disk: 0.5 }
	} ];


	var pkg = {
		overprovision_cpu: 1,
		overprovision_ram: 2,
		overprovision_disk: 1,
		overprovision_io: 1,
		overprovision_net: 1
	};

	var constraints = { pkg: pkg, defaults: {
		overprovision_ratio_cpu: 6,
		overprovision_ratio_ram: 0.75,
		overprovision_ratio_disk: 0.5
	} };

	plugin.run(LOG, SERVERS, constraints,
			function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, expectServers);
		t.deepEqual(reasons, EXPECT_REASONS);

		t.deepEqual(pkg, {
			overprovision_cpu: 6,
			overprovision_ram: 0.75,
			overprovision_disk: 0.5
		});

		t.end();
	});

});


test('disable overprovisioning with no servers', function (t) {
	var constraints = { pkg: {}, defaults: {} };

	plugin.run(LOG, [], constraints, function (err, servers, reasons) {
		assert.arrayOfObject(servers);
		assert.object(reasons);

		t.ifError(err);

		t.deepEqual(servers, []);
		t.deepEqual(reasons, {});

		t.end();
	});
});


test('name', function (t) {
	t.equal(typeof (plugin.name), 'string');
	t.end();
});
