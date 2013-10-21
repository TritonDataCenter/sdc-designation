/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-traits.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterTraits_for_VMs =
function (t) {
    var givenServers = [
        /* BEGIN JSSTYLED */
        { uuid: 'de52bbab-a12d-4e11-8292-c4141031553c', traits: { ssd: true,  users: 'john' } },
        { uuid: '56b19a96-bd79-4b0d-bf31-6287500e653c', traits: { ssd: true,  users: ['john', 'jane']} },
        { uuid: '11a7ea8e-a9ee-4101-852d-cd47536b9ff0', traits: { ssd: true  } },
        { uuid: 'c2edd722-16cd-4b2f-9436-5cde12cf0eb0', traits: { ssd: false } },
        { uuid: 'f459c92d-1b50-4cea-9412-8d7af4acfc31', traits: { users: ['jack', 'jane'] } },
        { uuid: '70675b48-a989-466a-9cde-8b65fa2df12e', traits: { users: 'john' } }
        /* END JSSTYLED */
    ];

    var results;
    var reasons;
    var constraints;
    var filteredServers;
    var expectedReasons;
    var state = {};

    constraints = { vm: { traits: { ssd: true } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { ssd: false } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(3, 4));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { users: 'john' } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(5, 6));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'users comparison failed: server trait array did not contain trait'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { users: 'jack' } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(4, 5));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'users comparison failed: strings did not match'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { ssd: true, users: 'jane' } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(1, 2));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'users comparison failed: strings did not match',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":true}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":false}',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":["jack","jane"]}',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":"john"}'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { ssd: false, users: 'jane' } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'ssd comparison failed: boolean did not match',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'ssd comparison failed: boolean did not match',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":true}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":false}',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":["jack","jane"]}',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":"john"}'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { users: ['john', 'jane' ] } }, img: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(4, 6));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterTraits_for_image_manifests =
function (t) {
    var givenServers = [
        /* BEGIN JSSTYLED */
        { uuid: 'de52bbab-a12d-4e11-8292-c4141031553c', traits: { ssd: true,  users: 'john' } },
        { uuid: '56b19a96-bd79-4b0d-bf31-6287500e653c', traits: { ssd: true,  users: ['john', 'jane']} },
        { uuid: '11a7ea8e-a9ee-4101-852d-cd47536b9ff0', traits: { ssd: true  } },
        { uuid: 'c2edd722-16cd-4b2f-9436-5cde12cf0eb0', traits: { ssd: false } },
        { uuid: 'f459c92d-1b50-4cea-9412-8d7af4acfc31', traits: { users: ['jack', 'jane'] } },
        { uuid: '70675b48-a989-466a-9cde-8b65fa2df12e', traits: { users: 'john' } }
        /* END JSSTYLED */
    ];

    var results;
    var reasons;
    var expectedReasons;
    var constraints;
    var filteredServers;
    var state = {};

    constraints = { vm: {}, pkg: {}, img: { traits: { ssd: true } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, pkg: {}, img: { traits: { ssd: false } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(3, 4));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, pkg: {}, img: { traits: { users: 'john' } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(5, 6));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'users comparison failed: server trait array did not contain trait'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, pkg: {}, img: { traits: { users: 'jack' } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(4, 5));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'users comparison failed: strings did not match'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, pkg: {},
                    img: { traits: { ssd: true, users: 'jane' } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(1, 2));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'users comparison failed: strings did not match',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":true}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":false}',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":["jack","jane"]}',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":"john"}'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, pkg: {},
                    img: { traits: { ssd: false, users: 'jane' } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, []);
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'ssd comparison failed: boolean did not match',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'ssd comparison failed: boolean did not match',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":true}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":false}',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":["jack","jane"]}',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":"john"}'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, pkg: {},
                    img: { traits: { users: ['john', 'jane'] } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(4, 6));
    t.deepEqual(state, {});
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":["john","jane"]}',
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterTraits_for_VMs_and_manifests =
function (t) {
    var givenServers = [
        /* BEGIN JSSTYLED */
        { uuid: 'de52bbab-a12d-4e11-8292-c4141031553c', traits: { ssd: true,  users: 'john' } },
        { uuid: '56b19a96-bd79-4b0d-bf31-6287500e653c', traits: { ssd: true,  users: ['john', 'jane']} },
        { uuid: '11a7ea8e-a9ee-4101-852d-cd47536b9ff0', traits: { ssd: true  } },
        { uuid: 'c2edd722-16cd-4b2f-9436-5cde12cf0eb0', traits: { ssd: false } },
        { uuid: 'f459c92d-1b50-4cea-9412-8d7af4acfc31', traits: { users: ['jack', 'jane'] } },
        { uuid: '70675b48-a989-466a-9cde-8b65fa2df12e', traits: { users: 'john' } }
        /* END JSSTYLED */
    ];

    var results;
    var reasons;
    var expectedReasons;
    var constraints;
    var filteredServers;
    var state = {};

    // image manifest overrides VM package
    constraints = { vm:  { traits: { ssd: false } },
                    img: { traits: { ssd: true } },
                    pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    // should merge values between the two
    constraints = { vm:  { traits: { ssd: true } },
                    img: { traits: { users: 'john' } },
                    pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(0, 2));
    expectedReasons = {
        /* BEGIN JSSTYLED */
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":true}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":false}',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":["jack","jane"]}',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":"john"}'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: { traits: { ssd: true } }, img: {}, pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, img: { traits: { ssd: true } }, pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(reasons, expectedReasons);

    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_for_packages_and_manifests =
function (t) {
    var givenServers = [
        /* BEGIN JSSTYLED */
        { uuid: 'de52bbab-a12d-4e11-8292-c4141031553c', traits: { ssd: true,  users: 'john' } },
        { uuid: '56b19a96-bd79-4b0d-bf31-6287500e653c', traits: { ssd: true,  users: ['john', 'jane']} },
        { uuid: '11a7ea8e-a9ee-4101-852d-cd47536b9ff0', traits: { ssd: true  } },
        { uuid: 'c2edd722-16cd-4b2f-9436-5cde12cf0eb0', traits: { ssd: false } },
        { uuid: 'f459c92d-1b50-4cea-9412-8d7af4acfc31', traits: { users: ['jack', 'jane'] } },
        { uuid: '70675b48-a989-466a-9cde-8b65fa2df12e', traits: { users: 'john' } }
        /* END JSSTYLED */
    ];

    var results;
    var reasons;
    var expectedReasons;
    var constraints;
    var filteredServers;
    var state = {};

    // image manifest overrides package
    constraints = { vm:  {},
                    img: { traits: { ssd: true  } },
                    pkg: { traits: { ssd: false } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    // VM overrides package
    constraints = { vm:  { traits: { ssd: true  } },
                    img: {},
                    pkg: { traits: { ssd: false } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(reasons, expectedReasons);

    // should merge values between the two
    constraints = { vm:  {},
                    img: { traits: { users: 'john' } },
                    pkg: { traits: { ssd: true     } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(0, 2));
    expectedReasons = {
        /* BEGIN JSSTYLED */
        '11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":true}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":false}',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":["jack","jane"]}',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":"john"}'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm:  {}, img: {}, pkg: { traits: { ssd: true } } };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    expectedReasons = {
        /* BEGIN JSSTYLED */
        'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
        '56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
        'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
        'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
        '70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm:  {}, img: { traits: { ssd: true } }, pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(2, 3));
    t.deepEqual(reasons, expectedReasons);

    t.deepEqual(state, {});

    t.done();
};



exports.filterTraits_with_no_traits_on_server =
function (t) {
    var results;
    var reasons;
    var expectedReasons;
    var givenServers = [
        { uuid: '097e339f-1a49-48b2-bec7-ae92a037c22a', requested_ram: 256 }
    ];
    var state = {};
    var constraints;
    var filteredServers;

    constraints = { vm: { traits: {} }, img: { traits: {} }, pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers);
    t.deepEqual(state, {});
    t.deepEqual(reasons, {});

    constraints = { vm:  { traits: { ssd: false } },
                    img: { traits: {} },
                    pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});
    expectedReasons = {
        // JSSTYLED
        '097e339f-1a49-48b2-bec7-ae92a037c22a': 'Combined vm/pkg/img traits require {"ssd":false} but server has undefined'
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterTraits_with_no_traits_on_VM_or_manifest =
function (t) {
    var results;
    var reasons;
    var expectedReasons;
    var givenServers = [
        { uuid: '636203ab-ae96-4d5c-aaf1-00f030958bee', traits: { ssd: true } },
        { uuid: 'cc0c7133-2bdd-4f49-93ae-f24350e8c4d2', traits: {} },
        { uuid: 'a8c4fc80-9987-4778-9c04-743393c50398' }
    ];
    var constraints;
    var filteredServers;
    var state = {};

    constraints = { vm: { traits: {} }, img: { traits: {} }, pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(1, 3));
    t.deepEqual(state, {});
    expectedReasons = {
        // JSSTYLED
        '636203ab-ae96-4d5c-aaf1-00f030958bee': 'Combined vm/pkg/img require no traits but server has {"ssd":true}'
    };
    t.deepEqual(reasons, expectedReasons);

    constraints = { vm: {}, img: {}, pkg: {} };
    results = filter.run(log, state, givenServers, constraints);
    filteredServers = results[0];
    reasons = results[1];
    t.deepEqual(filteredServers, givenServers.slice(1, 3));
    t.deepEqual(state, {});
    expectedReasons = {
        // JSSTYLED
        '636203ab-ae96-4d5c-aaf1-00f030958bee': 'Combined vm/pkg/img require no traits but server has {"ssd":true}'
    };

    t.done();
};



exports.filterTraits_with_no_servers =
function (t) {
    var state = {};
    var servers = [];
    var constraints = { vm: { ram: 512 }, pkg: {}, img: {} };

    var results = filter.run(log, state, servers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});
    t.deepEqual(reasons, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
