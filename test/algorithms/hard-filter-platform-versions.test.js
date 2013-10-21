/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-platform-versions.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };

var testServers = genServers([
    ['b6d9d432-16bd-41b5-b3ac-7e3986380c37', '6.5', '20121218T203452Z'],
    ['aa652df0-7954-4cbb-9243-3cbb2c99b7be', '6.5', '20121210T203034Z'],
    // null should default to 6.5
    ['5d4de22f-e082-43ae-83ec-9957be55f2e1', null,  '20130129T122401Z'],
    ['c15641a8-1dad-4b96-be1e-6aa694395aee', '7.0', '20121218T203452Z'],
    ['9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0', '7.0', '20121210T203034Z'],
    ['c98b17b0-d4f9-4a93-b4da-85ee6a065f8a', '7.0', '20130129T122401Z'],
    ['9902bee1-fe4a-4f77-93db-951ed5c501bb', '7.1', '20121218T203452Z'],
    ['f1a33640-8657-4572-8061-31e1ecebbade', '7.1', '20121210T203034Z'],
    ['26dbdcdc-ed50-4169-b27f-e12f27c20026', '7.1', '20130129T122401Z']
]);



exports.filterPlatformVersions_no_platform_requirements =
function (t) {
    var state = {};
    var expectedServers = testServers;
    var constraints = { img: {}, pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});
    t.deepEqual(reasons, {});

    t.done();
};



exports.filterPlatformVersions_min_platform_requirements_for_images =
function (t) {
    var expectedServers = testServers.slice(5, 9);
    expectedServers.unshift(testServers[3]);

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'7.0': '20121211T203034Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'b6d9d432-16bd-41b5-b3ac-7e3986380c37': 'Image or package requires min platform "undefined" for min version "undefined", but server has platform "20121218T203452Z" for version "6.5"',
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "undefined" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires min platform "undefined" for min version "undefined", but server has platform "20130129T122401Z" for version "6.5"',
        '9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires min platform "20121211T203034Z" for min version "undefined", but server has platform "20121210T203034Z" for version "7.0"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_min_platform_requirements_for_packages =
function (t) {
    var expectedServers = testServers.slice(5, 9);
    expectedServers.unshift(testServers[3]);

    var state = {};
    var constraints = { vm:  {},
                        img: {},
                        pkg: { min_platform: {'7.0': '20121211T203034Z'} } };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'b6d9d432-16bd-41b5-b3ac-7e3986380c37': 'Image or package requires min platform "undefined" for min version "undefined", but server has platform "20121218T203452Z" for version "6.5"',
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "undefined" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires min platform "undefined" for min version "undefined", but server has platform "20130129T122401Z" for version "6.5"',
        '9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires min platform "20121211T203034Z" for min version "undefined", but server has platform "20121210T203034Z" for version "7.0"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_max_platform_requirements =
function (t) {
    var expectedServers = testServers.slice(0, 3);
    expectedServers.push(testServers[4]);

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                max_platform: {'7.0': '20121211T203034Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'c15641a8-1dad-4b96-be1e-6aa694395aee': 'Image or package requires max platform "20121211T203034Z" for max version "undefined", but server has platform "20121218T203452Z" for version "7.0"',
        'c98b17b0-d4f9-4a93-b4da-85ee6a065f8a': 'Image or package requires max platform "20121211T203034Z" for max version "undefined", but server has platform "20130129T122401Z" for version "7.0"',
        '9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20121218T203452Z" for version "7.1"',
        'f1a33640-8657-4572-8061-31e1ecebbade': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20121210T203034Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_1 =
function (t) {
    var expectedServers = testServers.slice(0, 1);

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'6.5': '20121211T203034Z'},
                                max_platform: {'6.5': '20130128T203034Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "20121211T203034Z" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires max platform "20130128T203034Z" for max version "undefined", but server has platform "20130129T122401Z" for version "6.5"',
        'c15641a8-1dad-4b96-be1e-6aa694395aee': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20121218T203452Z" for version "7.0"',
        '9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20121210T203034Z" for version "7.0"',
        'c98b17b0-d4f9-4a93-b4da-85ee6a065f8a': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20130129T122401Z" for version "7.0"',
        '9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20121218T203452Z" for version "7.1"',
        'f1a33640-8657-4572-8061-31e1ecebbade': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20121210T203034Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "undefined" for max version "undefined", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_2 =
function (t) {
    var expectedServers = testServers.slice(2, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'6.5': '20121211T203034Z'},
                                max_platform: {'7.1': '20121217T203452Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "20121211T203034Z" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platform "20121217T203452Z" for max version "undefined", but server has platform "20121218T203452Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "20121217T203452Z" for max version "undefined", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_3 =
function (t) {
    var expectedServers = testServers.slice(3, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'6.5': '20121211T203034Z'},
                                max_platform: {'6.5': '20130101T122401Z',
                                               '7.1': '20121217T203452Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "20121211T203034Z" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires max platform "20130101T122401Z" for max version "7.1", but server has platform "20130129T122401Z" for version "6.5"',
        '9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platform "20121217T203452Z" for max version "7.1", but server has platform "20121218T203452Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "20121217T203452Z" for max version "7.1", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_4 =
function (t) {
    var expectedServers = testServers.slice(2, 7);
    expectedServers.unshift(testServers[0]);

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'6.5': '20121211T203034Z',
                                               '7.1': '20121211T203034Z'},
                                max_platform: {'7.1': '20121219T203452Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "20121211T203034Z" for min version "6.5", but server has platform "20121210T203034Z" for version "6.5"',
        'f1a33640-8657-4572-8061-31e1ecebbade': 'Image or package requires min platform "20121211T203034Z" for min version "6.5", but server has platform "20121210T203034Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "20121219T203452Z" for max version "undefined", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_5 =
function (t) {
    var expectedServers = testServers.slice(2, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'6.5': '20121218T203452Z'},
                                max_platform: {'7.1': '20121217T203452Z'}
                            }
                        },
                        pkg: { min_platform: {'6.5': '20121210T203034Z'} } };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "20121218T203452Z" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platform "20121217T203452Z" for max version "undefined", but server has platform "20121218T203452Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "20121217T203452Z" for max version "undefined", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_ignore_non_versions =
function (t) {
    var expectedServers = testServers.slice(2, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var constraints = { vm:  {},
                        img: {
                            requirements: {
                                min_platform: {'6.5': '20121211T203034Z',
                                               'smartos': '20121217T203452Z'},
                                max_platform: {'7.1': '20121217T203452Z',
                                               'smartos': '20121211T203034Z'}
                            }
                        },
                        pkg: {} };

    var results = filter.run(log, state, testServers, constraints);
    var filteredServers = results[0];
    var reasons = results[1];

    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    var expectedReasons = {
        /* BEGIN JSSTYLED */
        'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platform "20121211T203034Z" for min version "undefined", but server has platform "20121210T203034Z" for version "6.5"',
        '9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platform "20121217T203452Z" for max version "undefined", but server has platform "20121218T203452Z" for version "7.1"',
        '26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platform "20121217T203452Z" for max version "undefined", but server has platform "20130129T122401Z" for version "7.1"'
        /* END JSSTYLED */
    };
    t.deepEqual(reasons, expectedReasons);

    t.done();
};



exports.filterPlatformVersions_with_no_servers =
function (t) {
    var givenServers = [];
    var state = {};
    var constraints = { vm: {}, img: {}, pkg: {} };

    var results = filter.run(log, state, givenServers, constraints);
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



function genServers(serverData) {
    var servers = serverData.map(function (data) {
        return { uuid: data[0],
                 sysinfo: { 'SDC Version': data[1], 'Live Image': data[2] } };
    });

    return servers;
}