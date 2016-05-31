/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var common = require('./common');
var Allocator = require('../lib/allocator.js');


var logStub = {
	trace: function () { return true; },
	debug: function () { return true; },
	info:  function () { return true; },
	warn:  function () { return true; },
	error: function (err) { console.log(err); return true; }
};


test('defaults', function (t) {
	var allocator;

	allocator = new Allocator(logStub);
	t.deepEqual(allocator.defaults, {
		filter_headnode: true,
		filter_min_resources: true,
		filter_large_servers: true,
		weight_current_platform: 1,
		weight_next_reboot: 0.5,
		weight_num_owner_zones: 0,
		weight_uniform_random: 0.5,
		weight_unreserved_disk: 1,
		weight_unreserved_ram: 2
	});

	allocator = new Allocator(logStub, null, {});
	t.deepEqual(allocator.defaults, {
		filter_headnode: true,
		filter_min_resources: true,
		filter_large_servers: true,
		weight_current_platform: 1,
		weight_next_reboot: 0.5,
		weight_num_owner_zones: 0,
		weight_uniform_random: 0.5,
		weight_unreserved_disk: 1,
		weight_unreserved_ram: 2
	});

	var defaults = {
		filter_headnode: false,
		filter_min_resources: false,
		filter_large_servers: false,
		weight_current_platform: 4,
		weight_next_reboot: 5,
		weight_num_owner_zones: 6,
		weight_uniform_random: 7,
		weight_unreserved_disk: 8,
		weight_unreserved_ram: 9
	};
	allocator = new Allocator(logStub, null, defaults);
	t.deepEqual(allocator.defaults, defaults);

	t.end();
});


test('algorithms pipeline', function (t) {
	var serverStubs = [1, 2, 3, 4, 5];
	var executed = [];
	var allocator;
	var results;
	var serverStub;

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (log, state, servers) {
				t.ok(log.debug);
				t.deepEqual(state, {});
				t.deepEqual(servers, serverStubs);

				executed.push(1);
				return ([[5, 4, 3, 2]]);
			}
		}, {
			name: 'bar',
			run: function (log, state, servers) {
				t.ok(log.debug);
				t.deepEqual(state, {});
				t.deepEqual(servers, [5, 4, 3, 2]);

				state.bar = [42];
				executed.push(2);
				return ([[2, 3]]);
			},
			post: function (log, state, server, servers) {
				t.ok(log.debug);
				t.deepEqual(state, { bar: [42], baz: 'hi' });
				t.equal(server, 3);
				t.deepEqual(servers, serverStubs);

				state.bar.push(24);
				executed.push(3);
			}
		}, {
			name: 'baz',
			run: function (log, state, servers) {
				t.ok(log.debug);
				t.deepEqual(state, { bar: [42] });
				t.deepEqual(servers, [2, 3]);

				state.baz = 'hi';
				executed.push(4);
				return ([[3]]);
			}
		}
	];

	allocator = new Allocator(logStub);
	allocator.allocServerExpr = plugins;

	results = allocator.allocate(serverStubs, {}, {}, {});
	serverStub = results[0];
	t.equal(serverStub, 3);
	t.deepEqual(executed, [1, 2, 4, 3]);

	t.end();
});


/* assumes state from algorithms_pipeline() test */
test('algorithms state retained', function (t) {
	var serverStub = { uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' };
	var executed = [];
	var allocator;
	var results;
	var expected;

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (log, state) {
				t.deepEqual(state,
				    { bar: [42, 24], baz: 'hi' });
				executed.push(1);
				return ([[serverStub]]);
			}
		}, {
			name: 'bar',
			run: function (log, state) {
				t.deepEqual(state,
				    { bar: [42, 24], baz: 'hi' });
				executed.push(2);
				return ([[serverStub]]);
			}
		}, {
			name: 'baz',
			run: function (log, state) {
				t.deepEqual(state,
				    { bar: [42, 24], baz: 'hi' });
				executed.push(3);
				return ([[serverStub]]);
			}
		}
	];

	allocator = new Allocator(logStub);
	allocator.allocServerExpr = plugins;

	results = allocator.allocate([serverStub], {}, {}, {});
	t.deepEqual(executed, [1, 2, 3]);
	t.deepEqual(results[0], serverStub);

	expected = [
		{
			step: 'Received by DAPI',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		},
		{
			step: 'foo',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		},
		{
			step: 'bar',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		},
		{
			step: 'baz',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		}
	];

	t.deepEqual(results[1], expected);

	t.end();
});


test('algorithms shortcuts with no servers', function (t) {
	var serverStub = { uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' };
	var executed = [];
	var allocator;
	var results;
	var expected;

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function () {
				executed.push(1);
				return ([[serverStub]]);
			},
			post: function (log, state, server) {
				t.equal(server, undefined);
				executed.push(2);
			}
		}, {
			name: 'bar',
			run: function () {
				executed.push(3);
				return ([[serverStub]]);
			},
			post: function (log, state, server) {
				t.equal(server, undefined);
				executed.push(4);
			}
		}, {
			name: 'baz',
			run: function () {
				executed.push(5);
				return ([[]]);
			},
			post: function (log, state, server) {
				t.equal(server, undefined);
				executed.push(6);
			}
		}, {
			name: 'baz',
			run: function () {
				executed.push(7);
				return ([[]]);
			},
			post: function () {
				executed.push(8);
			}
		}
	];

	allocator = new Allocator(logStub);
	allocator.allocServerExpr = plugins;

	results = allocator.allocate([serverStub], {}, {}, {});
	t.deepEqual(executed, [1, 3, 5, 6, 4, 2]);
	t.equal(results[0], undefined);

	expected = [
		{
			step: 'Received by DAPI',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		},
		{
			step: 'foo',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		},
		{
			step: 'bar',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		},
		{
			step: 'baz',
			remaining: []
		}
	];

	t.deepEqual(results[1], expected);

	t.end();
});


test('dispatch 1', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];
	var allocator;
	var results;
	var expected;

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (log, state, servers) {
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([[serverStubs[0],
				    serverStubs[2], serverStubs[3]]]);
			}
		},
		[
			'or',
			{
				name: 'bar',
				run: function (log, state, servers) {
					t.deepEqual(servers,
					    [serverStubs[0], serverStubs[2],
					    serverStubs[3]]);
					executed.push(2);
					return ([[]]);
				}
			}, {
				name: 'baz',
				run: function (log, state, servers) {
					t.deepEqual(servers,
					    [serverStubs[0], serverStubs[2],
					    serverStubs[3]]);
					executed.push(3);
					return ([serverStubs.slice(0, 1)]);
				}
			}
		]
	];

	allocator = new Allocator(logStub);
	allocator.allocServerExpr = plugins;

	results = allocator.allocate(serverStubs, {}, {}, {});
	t.deepEqual(executed, [1, 2, 3]);
	t.deepEqual(results[0], serverStubs[0]);

	expected = [
		{
			step: 'Received by DAPI',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '1727e98c-50b0-46de-96dd-3b360f522ce7',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
		},
		{
			step: 'foo',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '1727e98c-50b0-46de-96dd-3b360f522ce7',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
		},
		{
			step: 'bar',
			remaining: []
		},
		{
			step: 'baz',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		}
	];

	t.deepEqual(results[1], expected);

	t.end();
});


test('dispatch 2', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];
	var allocator;
	var results;
	var expected;

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (log, state, servers) {
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([[serverStubs[0],
				    serverStubs[2], serverStubs[3]]]);
			}
		},
		[
			'or',
			{
				name: 'bar',
				run: function (log, state, servers) {
					t.deepEqual(servers,
					    [serverStubs[0],
					    serverStubs[2],
					    serverStubs[3]]);
					executed.push(2);
					return ([serverStubs.slice(0, 1)]);
				}
			}, {
				name: 'baz',
				run: function (log, state, servers) {
					t.ok(false);
				}
			}
		]
	];

	allocator = new Allocator(logStub);
	allocator.allocServerExpr = plugins;

	results = allocator.allocate(serverStubs, {}, {}, {});
	t.deepEqual(executed, [1, 2]);
	t.deepEqual(results[0], serverStubs[0]);

	expected = [
		{
			step: 'Received by DAPI',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '1727e98c-50b0-46de-96dd-3b360f522ce7',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
		},
		{
			step: 'foo',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '1727e98c-50b0-46de-96dd-3b360f522ce7',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ]
		},
		{
			step: 'bar',
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6' ]
		}
	];

	t.deepEqual(results[1], expected);

	t.end();
});


test('dispatch 3', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];
	var allocator;
	var results;
	var expected;

	var plugins = [
		'pipe',
		{
			name: 'foo',
			run: function (log, state, servers) {
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([[]]);
			}
		},
		[
			'or',
			{
				name: 'bar',
				run: function (log, state, servers) {
					t.ok(false);
				}
			}, {
				name: 'baz',
				run: function (log, state, servers) {
					t.ok(false);
				}
			}
		]
	];

	allocator = new Allocator(logStub);
	allocator.allocServerExpr = plugins;

	results = allocator.allocate(serverStubs, {}, {}, {});
	t.deepEqual(executed, [1]);
	t.equal(results[0], undefined);

	expected = [
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

	t.deepEqual(results[1], expected);

	t.end();
});


test('pipe 1', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];
	var allocator;
	var results;
	var serverStub;
	var visitedAlgorithms;
	var remainingServers;

	var plugins = [
		{
			name: 'foo',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([serverStubs.slice(0, 3)]);
			}
		}, {
			name: 'bar',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs.slice(0, 3));
				executed.push(2);
				return ([serverStubs.slice(1, 3)]);
			}
		}, {
			name: 'baz',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs.slice(1, 3));
				executed.push(3);
				return ([serverStubs.slice(2, 3)]);
			}
		}
	];

	allocator = new Allocator(logStub);

	results = allocator._pipe(plugins, serverStubs, { vm: { foo: 1 } });
	serverStub = results[0];
	visitedAlgorithms = results[1];
	remainingServers  = results[2];

	t.deepEqual(serverStub, serverStubs.slice(2, 3));
	t.deepEqual(executed, [1, 2, 3]);
	t.deepEqual(visitedAlgorithms, plugins);
	t.deepEqual(remainingServers,
	    [ [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
	    '94d987a9-968e-47ce-a959-4f14324bef7f',
	    '1727e98c-50b0-46de-96dd-3b360f522ce7' ],
	    [ '94d987a9-968e-47ce-a959-4f14324bef7f',
	    '1727e98c-50b0-46de-96dd-3b360f522ce7' ],
	    [ '1727e98c-50b0-46de-96dd-3b360f522ce7' ] ]);

	t.end();
});


test('pipe 2', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];
	var allocator;
	var results;
	var serverStub;
	var visitedAlgorithms;
	var remainingServers;

	var plugins = [
		{
			name: 'foo',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([serverStubs.slice(0, 3)]);
			}
		}, {
			name: 'bar',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs.slice(0, 3));
				executed.push(2);
				return ([[]]);
			}
		}, {
			name: 'baz',
			run: function (log, state, args) {
				t.ok(false);
			}
		}
	];

	allocator = new Allocator(logStub);

	results = allocator._pipe(plugins, serverStubs, { vm: { foo: 1 } });
	serverStub = results[0];
	visitedAlgorithms = results[1];
	remainingServers = results[2];

	t.deepEqual(serverStub, []);
	t.deepEqual(executed, [1, 2]);
	t.deepEqual(visitedAlgorithms, plugins.slice(0, 2));
	t.deepEqual(remainingServers,
	    [ [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
	    '94d987a9-968e-47ce-a959-4f14324bef7f',
	    '1727e98c-50b0-46de-96dd-3b360f522ce7' ],
	    [] ]);

	t.end();
});


test('or 1', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];

	var plugins = [
		{
			name: 'foo',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([[]]);
			}
		}, {
			name: 'bar',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(2);
				return ([[]]);
			}
		}, {
			name: 'baz',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(3);
				return ([[]]);
			}
		}
	];

	var allocator = new Allocator(logStub);

	var results = allocator._or(plugins, serverStubs, { vm: { foo: 1 } });
	var serverStub = results[0];
	var visitedAlgorithms = results[1];
	var remainingServers = results[2];

	t.deepEqual(serverStub, []);
	t.deepEqual(executed, [1, 2, 3]);
	t.deepEqual(visitedAlgorithms, plugins);
	t.deepEqual(remainingServers, [ [], [], [] ]);

	t.end();
});


test('or 2', function (t) {
	var serverStubs = [
		{ uuid: '66e94ea4-6b6b-4b62-a886-799c227e6ae6' },
		{ uuid: '94d987a9-968e-47ce-a959-4f14324bef7f' },
		{ uuid: '1727e98c-50b0-46de-96dd-3b360f522ce7' },
		{ uuid: '32f7e58c-3be8-4530-851a-2606bb8bc53f' }
	];
	var executed = [];

	var plugins = [
		{
			name: 'foo',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(1);
				return ([[]]);
			}
		}, {
			name: 'bar',
			run: function (log, state, servers, constraints) {
				t.deepEqual(constraints.vm, { foo: 1 });
				t.deepEqual(servers, serverStubs);
				executed.push(2);
				return ([serverStubs.slice(0, 2)]);
			}
		}, {
			name: 'baz',
			run: function (log, state, servers, constraints) {
				t.ok(false);
			}
		}
	];

	var allocator = new Allocator(logStub);

	var results = allocator._or(plugins, serverStubs, { vm: { foo: 1 } });
	var serverStub		= results[0];
	var visitedAlgorithms = results[1];
	var remainingServers  = results[2];

	t.deepEqual(serverStub, serverStubs.slice(0, 2));
	t.deepEqual(executed, [1, 2]);
	t.deepEqual(visitedAlgorithms, plugins.slice(0, 2));
	t.deepEqual(remainingServers,
	    [ [],
	    [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
	    '94d987a9-968e-47ce-a959-4f14324bef7f' ] ]);

	t.end();
});


test('cleanup', function (t) {
	var executed = [];

	var dup = {
		name: 'dup',
		post: function (log, state, server, servers, constraints) {
			t.deepEqual(constraints, { foo: 1 });
			t.deepEqual(server, { bar: 2 });
			t.deepEqual(servers, [1, 2, 3, 4]);
			executed.push(1);
		}
	};

	var plugins = [
		dup,
		{
			name: 'foo',
			post: function (log, state, server,
			    servers, constraints) {
				t.deepEqual(constraints, { foo: 1 });
				t.deepEqual(server, { bar: 2 });
				t.deepEqual(servers, [1, 2, 3, 4]);
				executed.push(2);
			}
		}, {
			name: 'bar'
		},
		dup,
		{
			name: 'baz',
			post: function (log, state, server,
			    servers, constraints) {
				t.deepEqual(constraints, { foo: 1 });
				t.deepEqual(server, { bar: 2 });
				t.deepEqual(servers, [1, 2, 3, 4]);
				executed.push(3);
			}
		}
	];

	var allocator = new Allocator(logStub);

	allocator._cleanup(plugins, { bar: 2 }, [1, 2, 3, 4], { foo: 1 });

	t.deepEqual(executed, [3, 1, 2]);

	t.end();
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

	var reasonsRemoved = [
		{ '1727e98c-50b0-46de-96dd-3b360f522ce7': 'quux' },
		{ '66e94ea4-6b6b-4b62-a886-799c227e6ae6': 'foo' },
		{
			'94d987a9-968e-47ce-a959-4f14324bef7f': 'bar',
			'32f7e58c-3be8-4530-851a-2606bb8bc53f': 'baz'
		}
	];

	var allocator = new Allocator(logStub);
	var summary = allocator._createPluginSummary(serverStubs,
		visitedAlgorithms, remainingServers, reasonsRemoved);

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
			remaining: [ '66e94ea4-6b6b-4b62-a886-799c227e6ae6',
			    '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ],
			reasons: {
				'1727e98c-50b0-46de-96dd-3b360f522ce7': 'quux'
			}
		},
		{
			step: 'bar',
			remaining: [ '94d987a9-968e-47ce-a959-4f14324bef7f',
			    '32f7e58c-3be8-4530-851a-2606bb8bc53f' ],
			reasons: {
				'66e94ea4-6b6b-4b62-a886-799c227e6ae6': 'foo'
			}
		},
		{
			step: 'baz',
			remaining: [],
			reasons: {
				'94d987a9-968e-47ce-a959-4f14324bef7f': 'bar',
				'32f7e58c-3be8-4530-851a-2606bb8bc53f': 'baz'
			}
		}
	];

	t.deepEqual(summary, expected);

	t.end();
});


test('load available algorithms', function (t) {
	var allocator = new Allocator(logStub);
	var algorithms = allocator._loadAvailableAlgorithms();

	var names = Object.keys(algorithms).sort();

	var expectedNames = [
		'calculate-recent-vms',
		'calculate-server-unreserved',
		'calculate-ticketed-vms',
		'hard-filter-capness',
		'hard-filter-headnode',
		'hard-filter-invalid-servers',
		'hard-filter-large-servers',
		'hard-filter-min-cpu',
		'hard-filter-min-disk',
		'hard-filter-min-ram',
		'hard-filter-overprovision-ratios',
		'hard-filter-owner-same-racks',
		'hard-filter-owner-same-servers',
		'hard-filter-owners-servers',
		'hard-filter-platform-versions',
		'hard-filter-reserved',
		'hard-filter-reservoir',
		'hard-filter-running',
		'hard-filter-setup',
		'hard-filter-sick-servers',
		'hard-filter-ticketed-servers',
		'hard-filter-traits',
		'hard-filter-vlans',
		'hard-filter-vm-count',
		'hard-filter-volumes-from',
		'identity',
		'override-overprovisioning',
		'pick-random',
		'pick-weighted-random',
		'score-current-platform',
		'score-next-reboot',
		'score-num-owner-zones',
		'score-uniform-random',
		'score-unreserved-disk',
		'score-unreserved-ram',
		'soft-filter-large-servers',
		'soft-filter-locality-hints',
		'soft-filter-owner-many-zones',
		'soft-filter-recent-servers'
	];

	t.deepEqual(names, expectedNames);

	t.end();
});


test('load algorithms', function (t) {
	var allocator = new Allocator(logStub);
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

	var allocator = new Allocator(logStub);
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


test('deepCopy', function (t) {
	var allocator = new Allocator(logStub);
	var original, clone;
	var frozen;

	original = null;
	clone = allocator._deepCopy(original);
	t.equal(original, null);
	t.equal(clone, null);

	original = 1;
	clone = allocator._deepCopy(original);
	t.equal(original, 1);
	t.equal(clone, 1);

	original = 'foo';
	clone = allocator._deepCopy(original);
	t.equal(original, 'foo');
	t.equal(clone, 'foo');

	original = [1];
	clone = allocator._deepCopy(original);
	t.deepEqual(original, [1]);
	t.deepEqual(clone, [1]);
	clone.push(2);
	t.deepEqual(original, [1]);

	original = { a: 1 };
	clone = allocator._deepCopy(original);
	t.deepEqual(original, { a: 1 });
	t.deepEqual(clone, { a: 1 });
	clone.a = 2;
	t.deepEqual(original, { a: 1 });

	frozen = new Buffer('lolcats');

	original = new Buffer('lolcats');
	clone = allocator._deepCopy(original);
	t.deepEqual(original, frozen);
	t.deepEqual(clone, frozen);
	clone.writeUInt8(67, 0);
	t.deepEqual(original, frozen);

	original = { a: [1, { b: 2 }, frozen, 'foo'] };
	clone = allocator._deepCopy(original);
	t.deepEqual(original, { a: [1, { b: 2 }, frozen, 'foo'] });
	t.deepEqual(clone, { a: [1, { b: 2 }, frozen, 'foo'] });
	clone.a[3] = 'bar';
	clone.a[2].writeUInt8(67, 0);
	clone.a[1].b = 3;
	clone.a[1].c = 3;
	clone.a[0] = 2;
	clone.a.push(null);
	t.deepEqual(original, { a: [1, { b: 2 }, frozen, 'foo'] });

	t.end();
});


test('server capacity', function (t) {
	var allocator = new Allocator(logStub);
	var results = allocator.serverCapacity(common.getExampleServers());

	var expectedResults = [ {
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
	},
	{
		asdsa: 'Server has status: undefined'
	} ];

	t.deepEqual(results, expectedResults);

	t.end();
});
