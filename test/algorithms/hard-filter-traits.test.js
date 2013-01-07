/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-traits.js');

var log = { trace: function () {}, debug: function () {} };



exports.filterTraits =
function (t) {
    var givenServers = [
        { traits: { ssd: true,  users: 'john' } },
        { traits: { ssd: true,  users: ['john', 'jane']} },
        { traits: { ssd: true  } },
        { traits: { ssd: false } },
        { traits: { users: ['jack', 'jane'] } },
        { traits: { users: 'john' } }
    ];

    var filteredServers;
    var state = {};

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { ssd: true } });
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { ssd: false } });
    t.deepEqual(filteredServers, givenServers.slice(3, 4));
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { users: 'john' } });
    t.deepEqual(filteredServers, givenServers.slice(5, 6));
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { users: 'jack' } });
    t.deepEqual(filteredServers, givenServers.slice(4, 5));
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { ssd: true, users: 'jane' } });
    t.deepEqual(filteredServers, givenServers.slice(1, 2));
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { ssd: false, users: 'jane' } });
    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { users: ['john', 'jane' ] } });
    t.deepEqual(filteredServers, givenServers.slice(4, 6));
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_traits_on_server =
function (t) {
    var givenServers = [ { requested_ram: 256 } ];
    var state = {};
    var filteredServers;

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: {} });
    t.deepEqual(filteredServers, givenServers);
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers,
                                 { traits: { ssd: false } });
    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_traits_on_vm =
function (t) {
    var givenServers = [ { traits: { ssd: true } },
                         { traits: {} },
                         {} ];
    var state = {};
    var filteredServers;

    filteredServers = filter.run(log, state, givenServers, { traits: {} });
    t.deepEqual(filteredServers, givenServers.slice(1, 3));
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, givenServers, {});
    t.deepEqual(filteredServers, givenServers.slice(1, 3));
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_servers =
function (t) {
    var state = {};

    var filteredServers = filter.run(log, state, [], { ram: 512 });

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
