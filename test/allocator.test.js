/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2019, Joyent, Inc.
 */

var assert = require('assert-plus');
var test = require('tape');
var common = require('./common');
var Allocator = require('../lib/allocator.js');
var addCommonOpts = require('./algorithms/common.js').addCommonOpts;

var OPTS = addCommonOpts({});


test('algorithms pipeline', function (t) {
	var serverStubs = [ {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5} ];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(servers, serverStubs);

				executed.push(1);
				cb(null, [
					{id: 5}, {id: 4}, {id: 3}, {id: 2}
				], {});
			}
		}, {
			name: 'bar',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(servers, [
					{id: 5}, {id: 4}, {id: 3}, {id: 2}
				]);

				executed.push(2);
				cb(null, [ {id: 2}, {id: 3} ], {});
			}
		}, {
			name: 'baz',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(servers, [ {id: 2}, {id: 3} ]);

				executed.push(3);
				cb(null, [ {id: 3} ], {});
			}
		}
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	allocator.allocServerExpr = plugins;

	allocator.allocate(serverStubs, {}, {}, {}, [], function (err, stub) {
		t.ifError(err);

		t.deepEqual(stub, {id: 3});
		t.deepEqual(executed, [1, 2, 3]);

		t.end();
	});
});


test('algorithms shortcuts with no servers', function (t) {
	var serverStub = { uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' };

	var expected = [ {
		step: 'Received by DAPI',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
	}, {
		step: 'foo',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
	}, {
		step: 'bar',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
	}, {
		step: 'baz',
		remaining: []
	} ];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				executed.push(1);
				cb(null, [serverStub], {});
			}
		}, {
			name: 'bar',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				executed.push(2);
				cb(null, [serverStub], {});
			}
		}, {
			name: 'baz',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				executed.push(3);
				cb(null, [], {});
			}
		}, {
			name: 'quux',
			run: function () {
				t.ok(false);
			}
		}
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	allocator.allocServerExpr = plugins;

	allocator.allocate([serverStub], {}, {}, {}, [],
			function (err, stub, reasons) {
		t.ifError(err);
		t.deepEqual(executed, [1, 2, 3]);
		t.equal(stub, undefined);

		t.deepEqual(reasons, expected);

		t.end();
	});
});


test('dispatch 1', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var expected = [ {
		step: 'Received by DAPI',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'1727e98c-50b0-46de-96dd-3b360f522ce7',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
	}, {
		step: 'foo',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'1727e98c-50b0-46de-96dd-3b360f522ce7',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
	}, {
		step: 'bar',
		remaining: []
	}, {
		step: 'baz',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
	} ];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(servers, serverStubs);
				executed.push(1);
				cb(null, [serverStubs[0], serverStubs[2],
					serverStubs[3]], {});
			}
		},
		[
			'or',
			{
				name: 'bar',
				run: function (servers, opts, cb) {
					assert.array(servers);
					assert.object(opts);
					assert.func(cb);

					t.deepEqual(servers,
					    [serverStubs[0], serverStubs[2],
					    serverStubs[3]]);

					executed.push(2);

					cb(null, [], {});
				}
			}, {
				name: 'baz',
				run: function (servers, opts, cb) {
					assert.array(servers);
					assert.object(opts);
					assert.func(cb);

					t.deepEqual(servers,
					    [serverStubs[0], serverStubs[2],
					    serverStubs[3]]);

					executed.push(3);

					cb(null, serverStubs.slice(0, 1), {});
				}
			}
		]
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	allocator.allocServerExpr = plugins;

	allocator.allocate(serverStubs, {}, {}, {}, [],
			function (err, stub, reasons) {
		t.ifError(err);

		t.deepEqual(executed, [1, 2, 3]);
		t.deepEqual(stub, serverStubs[0]);
		t.deepEqual(reasons, expected);

		t.end();
	});
});


test('dispatch 2', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var expected = [ {
		step: 'Received by DAPI',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'1727e98c-50b0-46de-96dd-3b360f522ce7',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
	}, {
		step: 'foo',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'1727e98c-50b0-46de-96dd-3b360f522ce7',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
	}, {
		step: 'bar',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
	} ];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(servers, serverStubs);
				executed.push(1);

				cb(null, [serverStubs[0], serverStubs[2],
					serverStubs[3]], {});
			}
		},
		[
			'or',
			{
				name: 'bar',
				run: function (servers, opts, cb) {
					assert.array(servers);
					assert.object(opts);
					assert.func(cb);

					t.deepEqual(servers,
					    [serverStubs[0],
					    serverStubs[2],
					    serverStubs[3]]);

					executed.push(2);

					cb(null, serverStubs.slice(0, 1), {});
				}
			}, {
				name: 'baz',
				run: function () {
					t.ok(false);
				}
			}
		]
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	allocator.allocServerExpr = plugins;

	allocator.allocate(serverStubs, {}, {}, {}, [],
			function (err, stub, reasons) {
		t.ifError(err);

		t.deepEqual(executed, [1, 2]);
		t.deepEqual(stub, serverStubs[0]);
		t.deepEqual(reasons, expected);

		t.end();
	});
});


test('dispatch 3', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var expected = [
		{
			step: 'Received by DAPI',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '1727e98c-50b0-46de-96dd-3b360f522ce7',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
		},
		{
			step: 'foo',
			remaining: []
		}
	];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(servers, serverStubs);
				executed.push(1);

				cb(null, [], {});
			}
		},
		[
			'or',
			{
				name: 'bar',
				run: function () {
					t.ok(false);
				}
			}, {
				name: 'baz',
				run: function () {
					t.ok(false);
				}
			}
		]
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	allocator.allocServerExpr = plugins;

	allocator.allocate(serverStubs, {}, {}, {}, [],
			function (err, stub, reasons) {
		t.ifError(err);

		t.deepEqual(executed, [1]);
		t.equal(stub, undefined);
		t.deepEqual(reasons, expected);

		t.end();
	});
});


test('pipe 1', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(1);

				cb(null, serverStubs.slice(0, 3), {});
			}
		}, {
			name: 'bar',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs.slice(0, 3));

				executed.push(2);

				cb(null, serverStubs.slice(1, 3), {});
			}
		}, {
			name: 'baz',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs.slice(1, 3));

				executed.push(3);

				cb(null, serverStubs.slice(2, 3), {});
			}
		}
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var opts2 = { log: OPTS.log, vm: { foo: 1 } };

	allocator._dispatch(plugins, serverStubs, opts2,
			function (err, serverStub, visitedAlgorithms,
			remainingServers, reasons) {
		t.ifError(err);

		t.deepEqual(serverStub, serverStubs.slice(2, 3));
		t.deepEqual(executed, [1, 2, 3]);
		t.deepEqual(visitedAlgorithms, plugins.slice(1, 4));
		t.deepEqual(remainingServers, [ [
			'66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'1727e98c-50b0-46de-96dd-3b360f522ce7'
		], [
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'1727e98c-50b0-46de-96dd-3b360f522ce7'
		], [
			'1727e98c-50b0-46de-96dd-3b360f522ce7'
		] ]);

		t.end();
	});
});


test('pipe 2', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(1);

				cb(null, serverStubs.slice(0, 3), {});
			}
		}, {
			name: 'bar',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs.slice(0, 3));

				executed.push(2);

				cb(null, [], {});
			}
		}, {
			name: 'baz',
			run: function () {
				t.ok(false);
			}
		}
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var opts2 = { log: OPTS.log, vm: { foo: 1 } };

	allocator._dispatch(plugins, serverStubs, opts2,
			function (err, serverStub, visitedAlgorithms,
			remainingServers, reasons) {
		t.ifError(err);

		t.deepEqual(serverStub, []);
		t.deepEqual(executed, [1, 2]);
		t.deepEqual(visitedAlgorithms, plugins.slice(1, 3));
		t.deepEqual(remainingServers, [ [
			'66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'1727e98c-50b0-46de-96dd-3b360f522ce7'
		], [] ]);

		t.end();
	});
});


test('or 1', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var plugins = [
		'or',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(1);

				cb(null, [], {});
			}
		}, {
			name: 'bar',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(2);

				cb(null, [], {});
			}
		}, {
			name: 'baz',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(3);

				cb(null, [], {});
			}
		}
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var opts2 = { log: OPTS.log, vm: { foo: 1 } };

	allocator._dispatch(plugins, serverStubs, opts2,
			function (err, serverStub, visitedAlgorithms,
			remainingServers, reasons) {
		t.ifError(err);

		t.deepEqual(serverStub, []);
		t.deepEqual(executed, [1, 2, 3]);
		t.deepEqual(visitedAlgorithms, plugins.slice(1, 4));
		t.deepEqual(remainingServers, [ [], [], [] ]);

		t.end();
	});
});



test('or 2', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var plugins = [
		'or',
		{
			name: 'foo',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(1);

				cb(null, [], {});
			}
		}, {
			name: 'bar',
			run: function (servers, opts, cb) {
				assert.array(servers);
				assert.object(opts);
				assert.func(cb);

				t.deepEqual(opts.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);

				executed.push(2);

				cb(null, serverStubs.slice(0, 2), {});
			}
		}, {
			name: 'baz',
			run: function () {
				t.ok(false);
			}
		}
	];

	var executed = [];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var opts2 = { log: OPTS.log, vm: { foo: 1 } };

	allocator._dispatch(plugins, serverStubs, opts2,
			function (err, serverStub, visitedAlgorithms,
			remainingServers, reasons) {
		t.ifError(err);

		t.deepEqual(serverStub, serverStubs.slice(0, 2));
		t.deepEqual(executed, [1, 2]);
		t.deepEqual(visitedAlgorithms, plugins.slice(1, 3));
		t.deepEqual(remainingServers, [ [], [
			'66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'94d987a9-968e-47ce-a959-4f14324bef7f'
		] ]);

		t.end();
	});
});


test('create plugin summary', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];

	var visitedAlgorithms = [
		{ name: 'foo' },
		{ name: 'bar' },
		{ name: 'baz' }
	];

	var remainingServers = [
		[
			'66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f'
		],
		[
			'94d987a9-968e-47ce-a959-4f14324bef7f',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f'
		],
		[]
	];

	var expected = [ {
		step: 'Received by DAPI',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '1727e98c-50b0-46de-96dd-3b360f522ce7',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
	}, {
		step: 'foo',
		remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ],
		reasons: {
			'1727e98c-50b0-46de-96dd-3b360f522ce7': 'quux'
		}
	}, {
		step: 'bar',
		remaining: [ '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ],
		reasons: {
			'66e94ea4-6b6b-4b62-a886-799c227e6ae6': 'foo'
		}
	}, {
		step: 'baz',
		remaining: [],
		reasons: {
			'94d987a9-968e-47ce-a959-4f14324bef7f': 'bar',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f': 'baz'
		}
	} ];

	var reasonsRemoved = [
		{ '1727e98c-50b0-46de-96dd-3b360f522ce7': 'quux' },
		{ '66e94ea4-6b6b-4b62-a886-799c227e6ae6': 'foo' },
		{
			'94d987a9-968e-47ce-a959-4f14324bef7f': 'bar',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f': 'baz'
		}
	];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var summary = allocator._createPluginSummary(serverStubs,
		visitedAlgorithms, remainingServers, reasonsRemoved);

	t.deepEqual(summary, expected);

	t.end();
});


test('load available algorithms', function (t) {
	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var algorithms = allocator._loadAvailableAlgorithms();

	var names = Object.keys(algorithms).sort();

	var expectedNames = [
		'calculate-server-unreserved',
		'calculate-ticketed-vms',
		'hard-filter-capness',
		'hard-filter-feature-min-platform',
		'hard-filter-force-failure',
		'hard-filter-headnode',
		'hard-filter-hvm',
		'hard-filter-invalid-servers',
		'hard-filter-large-servers',
		'hard-filter-locality-hints',
		'hard-filter-min-cpu',
		'hard-filter-min-disk',
		'hard-filter-min-free-disk',
		'hard-filter-min-ram',
		'hard-filter-overprovision-ratios',
		'hard-filter-owners-servers',
		'hard-filter-platform-versions',
		'hard-filter-reserved',
		'hard-filter-reservoir',
		'hard-filter-running',
		'hard-filter-setup',
		'hard-filter-traits',
		'hard-filter-virtual-servers',
		'hard-filter-vlans',
		'hard-filter-vm-count',
		'hard-filter-volumes-from',
		'identity',
		'load-server-vms',
		'override-overprovisioning',
		'score-current-platform',
		'score-next-reboot',
		'score-num-owner-zones',
		'score-uniform-random',
		'score-unreserved-disk',
		'score-unreserved-ram',
		'soft-filter-locality-hints'
	];

	t.deepEqual(names, expectedNames);

	t.end();
});


test('load algorithms', function (t) {
	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var algorithm = allocator._loadAlgorithm('hard-filter-headnode');

	t.equal(algorithm.name, 'Servers which are not headnodes');

	t.end();
});


test('create expression', function (t) {
	var description = [
		'or',
		[ 'pipe',
			'hard-filter-headnode',
			'hard-filter-min-disk'
		],
		[ 'pipe',
			'hard-filter-running',
			'hard-filter-setup',
			'hard-filter-traits'
		]
	];

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	var availableAlgorithms = allocator._loadAvailableAlgorithms();
	var expression = allocator._createExpression(description,
	    availableAlgorithms);

	var expectedExpression = [
		'or',
		[ 'pipe',
			availableAlgorithms['hard-filter-headnode'],
			availableAlgorithms['hard-filter-min-disk']
		],
		['pipe',
			availableAlgorithms['hard-filter-running'],
			availableAlgorithms['hard-filter-setup'],
			availableAlgorithms['hard-filter-traits']
		]
	];

	t.deepEqual(expectedExpression, expression);

	t.end();
});


test('server capacity with default overprovisioning', function (t) {
	var expectedServers = {
		'00000000-0000-0000-0000-00259094373c': {
			cpu: 6100,
			ram: 100627,
			disk: 3015003
		},
		'00000000-0000-0000-0000-0025909437d4': {
			cpu: 5525,
			ram: 105619,
			disk: -27904
		}
	};

	var expectedReasons = {
		asdsa: 'Server has status: undefined',
		skip: 'getServerVms not set; assuming server.vms is ' +
			'already populated'
	};

	var allocator = new Allocator(OPTS, common.ALGO_DESC, common.DEFAULTS);
	allocator.serverCapacity(common.getExampleServers(),
			function (err, servers, reasons) {
		t.ifError(err);
		t.deepEqual(servers, expectedServers);
		t.deepEqual(reasons, expectedReasons);
		t.end();
	});
});


test('server capacity with altered overprovisioning', function (t) {
	var expectedServers = {
		'00000000-0000-0000-0000-00259094373c': {
			cpu: 6199,
			ram: 106941,
			disk: 3047003
		},
		'00000000-0000-0000-0000-0025909437d4': {
			cpu: 5816,
			ram: 109459,
			disk: 777728
		}
	};

	var expectedReasons = {
		asdsa: 'Server has status: undefined',
		skip: 'getServerVms not set; assuming server.vms is ' +
			'already populated'
	};

	var defaults = {
		overprovision_ratio_cpu: 6,
		overprovision_ratio_ram: 3,
		overprovision_ratio_disk: 2
	};

	Object.keys(common.DEFAULTS).forEach(function (key) {
		defaults[key] = defaults[key] || common.DEFAULTS[key];
	});

	var allocator = new Allocator(OPTS, common.ALGO_DESC, defaults);
	allocator.serverCapacity(common.getExampleServers(),
			function (err, servers, reasons) {
		t.ifError(err);
		t.deepEqual(servers, expectedServers);
		t.deepEqual(reasons, expectedReasons);
		t.end();
	});
});
