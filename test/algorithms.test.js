/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var algorithms = require('../lib/algorithms.js');

var logStub = { trace: function () { return true; },
                debug: function () { return true; },
                error: function (err) { console.log(err); return true; } };



exports.algorithms_pipeline =
function (t) {
    var serverStubs = [1, 2, 3, 4, 5];
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.ok(log.debug);
                t.deepEqual(state, {});
                t.deepEqual(servers, serverStubs);

                executed.push(1);
                return [5, 4, 3, 2];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers) {
                t.ok(log.debug);
                t.deepEqual(state, {});
                t.deepEqual(servers, [5, 4, 3, 2]);

                state.bar = [42];
                executed.push(2);
                return [2, 3];
            },
            post: function (log, state, server, servers) {
                t.ok(log.debug);
                t.deepEqual(state, { bar: [42] });
                t.equal(server, 3);
                t.deepEqual(servers, serverStubs);

                state.bar.push(24);
                executed.push(3);
            }
        }, {
            name: 'baz',
            run: function (log, state, servers) {
                t.ok(log.debug);
                t.deepEqual(state, {});
                t.deepEqual(servers, [2, 3]);

                state.bar = 'hi';
                state.baz = {};
                executed.push(4);
                return [3];
            }
        }
    ];

    var serverStub = algorithms.allocate(logStub, plugins, serverStubs);
    t.equal(serverStub, 3);
    t.deepEqual(executed, [1, 2, 4, 3]);

    t.done();
};



// assumes state from algorithms_pipeline() test
exports.algorithms_state_retained =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.deepEqual(state, {});
                executed.push(1);
                return [1];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers) {
                t.deepEqual(state, { bar: [42, 24] });
                executed.push(2);
                return [1];
            }
        }, {
            name: 'baz',
            run: function (log, state, servers) {
                t.deepEqual(state, { bar: 'hi', baz: {} });
                executed.push(3);
                return [1];
            }
        }
    ];

    var serverStub = algorithms.allocate(logStub, plugins, [1]);
    t.equal(serverStub, 1);
    t.deepEqual(executed, [1, 2, 3]);

    t.done();
};



exports.algorithms_shortcuts_with_no_servers =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function () {
                executed.push(1);
                return [1];
            },
            post: function (log, state, server) {
                t.equal(server, undefined);
                executed.push(2);
            }
        }, {
            name: 'bar',
            run: function () {
                executed.push(3);
                return [1];
            },
            post: function (log, state, server) {
                t.equal(server, undefined);
                executed.push(4);
            }
        }, {
            name: 'baz',
            run: function () {
                executed.push(5);
                return [];
            },
            post: function (log, state, server) {
                t.equal(server, undefined);
                executed.push(6);
            }
        }, {
            name: 'baz',
            run: function () {
                executed.push(7);
                return [];
            },
            post: function () {
                executed.push(8);
            }
        }
    ];

    var serverStub = algorithms.allocate(logStub, plugins, [1]);
    t.equal(serverStub, undefined);
    t.deepEqual(executed, [1, 3, 5, 6, 4, 2]);

    t.done();
};
