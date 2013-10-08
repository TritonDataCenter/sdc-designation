/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-traits.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterTraits_for_VMs =
function (t) {
    var givenServers = [
        { traits: { ssd: true,  users: 'john' } },
        { traits: { ssd: true,  users: ['john', 'jane']} },
        { traits: { ssd: true  } },
        { traits: { ssd: false } },
        { traits: { users: ['jack', 'jane'] } },
        { traits: { users: 'john' } }
    ];

    var constraints;
    var filteredServers;
    var state = {};

    constraints = { vm: { traits: { ssd: true } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(state, {});

    constraints = { vm: { traits: { ssd: false } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(3, 4));
    t.deepEqual(state, {});

    constraints = { vm: { traits: { users: 'john' } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(5, 6));
    t.deepEqual(state, {});

    constraints = { vm: { traits: { users: 'jack' } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(4, 5));
    t.deepEqual(state, {});

    constraints = { vm: { traits: { ssd: true, users: 'jane' } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(1, 2));
    t.deepEqual(state, {});

    constraints = { vm: { traits: { ssd: false, users: 'jane' } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});

    constraints = { vm: { traits: { users: ['john', 'jane' ] } }, img: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(4, 6));
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_for_image_manifests =
function (t) {
    var givenServers = [
        { traits: { ssd: true,  users: 'john' } },
        { traits: { ssd: true,  users: ['john', 'jane']} },
        { traits: { ssd: true  } },
        { traits: { ssd: false } },
        { traits: { users: ['jack', 'jane'] } },
        { traits: { users: 'john' } }
    ];

    var constraints;
    var filteredServers;
    var state = {};

    constraints = { vm: {}, pkg: {}, img: { traits: { ssd: true } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(state, {});

    constraints = { vm: {}, pkg: {}, img: { traits: { ssd: false } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(3, 4));
    t.deepEqual(state, {});

    constraints = { vm: {}, pkg: {}, img: { traits: { users: 'john' } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(5, 6));
    t.deepEqual(state, {});

    constraints = { vm: {}, pkg: {}, img: { traits: { users: 'jack' } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(4, 5));
    t.deepEqual(state, {});

    constraints = { vm: {}, pkg: {},
                    img: { traits: { ssd: true, users: 'jane' } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(1, 2));
    t.deepEqual(state, {});

    constraints = { vm: {}, pkg: {},
                    img: { traits: { ssd: false, users: 'jane' } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});

    constraints = { vm: {}, pkg: {},
                    img: { traits: { users: ['john', 'jane'] } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(4, 6));
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_for_VMs_and_manifests =
function (t) {
    var givenServers = [
        { traits: { ssd: true,  users: 'john' } },
        { traits: { ssd: true,  users: ['john', 'jane']} },
        { traits: { ssd: true  } },
        { traits: { ssd: false } },
        { traits: { users: ['jack', 'jane'] } },
        { traits: { users: 'john' } }
    ];

    var constraints;
    var filteredServers;
    var state = {};

    // image manifest overrides VM package
    constraints = { vm:  { traits: { ssd: false } },
                    img: { traits: { ssd: true } },
                    pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    // should merge values between the two
    constraints = { vm:  { traits: { ssd: true } },
                    img: { traits: { users: 'john' } },
                    pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(0, 2));

    constraints = { vm: { traits: { ssd: true } }, img: {}, pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    constraints = { vm: {}, img: { traits: { ssd: true } }, pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_for_packages_and_manifests =
function (t) {
    var givenServers = [
        { traits: { ssd: true,  users: 'john' } },
        { traits: { ssd: true,  users: ['john', 'jane']} },
        { traits: { ssd: true  } },
        { traits: { ssd: false } },
        { traits: { users: ['jack', 'jane'] } },
        { traits: { users: 'john' } }
    ];

    var constraints;
    var filteredServers;
    var state = {};

    // image manifest overrides package
    constraints = { vm:  {},
                    img: { traits: { ssd: true  } },
                    pkg: { traits: { ssd: false } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    // VM overrides package
    constraints = { vm:  { traits: { ssd: true  } },
                    img: {},
                    pkg: { traits: { ssd: false } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    // should merge values between the two
    constraints = { vm:  {},
                    img: { traits: { users: 'john' } },
                    pkg: { traits: { ssd: true     } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(0, 2));


    constraints = { vm:  {}, img: {}, pkg: { traits: { ssd: true } } };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    constraints = { vm:  {}, img: { traits: { ssd: true } }, pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(2, 3));

    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_traits_on_server =
function (t) {
    var givenServers = [ { requested_ram: 256 } ];
    var state = {};
    var constraints;
    var filteredServers;

    constraints = { vm: { traits: {} }, img: { traits: {} }, pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers);
    t.deepEqual(state, {});

    constraints = { vm:  { traits: { ssd: false } },
                    img: { traits: {} },
                    pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_traits_on_VM_or_manifest =
function (t) {
    var givenServers = [ { traits: { ssd: true } },
                         { traits: {} },
                         {} ];
    var constraints;
    var filteredServers;
    var state = {};

    constraints = { vm: { traits: {} }, img: { traits: {} }, pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(1, 3));
    t.deepEqual(state, {});

    constraints = { vm: {}, img: {}, pkg: {} };
    filteredServers = filter.run(log, state, givenServers, constraints);
    t.deepEqual(filteredServers, givenServers.slice(1, 3));
    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_servers =
function (t) {
    var state = {};

    var constraints = { vm: { ram: 512 }, pkg: {}, img: {} };
    var filteredServers = filter.run(log, state, [], constraints);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
