/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-platform-versions.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };

var testServers = genServers([[128, '6.5', '20121218T203452Z'],
                              [384, '6.5', '20121210T203034Z'],
                              [768, '6.5', '20130129T122401Z'],
                              [128, '7.0', '20121218T203452Z'],
                              [384, '7.0', '20121210T203034Z'],
                              [768, '7.0', '20130129T122401Z'],
                              [128, '7.1', '20121218T203452Z'],
                              [384, '7.1', '20121210T203034Z'],
                              [768, '7.1', '20130129T122401Z']]);



exports.filterPlatformVersions_no_platform_requirements =
function (t) {
    var state = {};
    var expectedServers = testServers;
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {};

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_min_platform_requirements_for_images =
function (t) {
    var expectedServers = testServers.slice(5, 9);
    expectedServers.unshift(testServers[3]);

    var state = {};
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: {'7.0': '20121211T203034Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_min_platform_requirements_for_packages =
function (t) {
    var expectedServers = testServers.slice(5, 9);
    expectedServers.unshift(testServers[3]);

    var state = {};
    var vmDetails = {};
    var pkgDetails = { min_platform: {'7.0': '20121211T203034Z'} };
    var imgDetails = {};

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_max_platform_requirements =
function (t) {
    var expectedServers = testServers.slice(0, 3);
    expectedServers.push(testServers[4]);

    var state = {};
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            max_platform: {'7.0': '20121211T203034Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_1 =
function (t) {
    var state = {};
    var expectedServers = testServers.slice(0, 1);
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: {'6.5': '20121211T203034Z'},
            max_platform: {'6.5': '20130128T203034Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_2 =
function (t) {
    var expectedServers = testServers.slice(2, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: {'6.5': '20121211T203034Z'},
            max_platform: {'7.1': '20121217T203452Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_3 =
function (t) {
    var expectedServers = testServers.slice(3, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: {'6.5': '20121211T203034Z'},
            max_platform: {'6.5': '20130101T122401Z',
                           '7.1': '20121217T203452Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_4 =
function (t) {
    var expectedServers = testServers.slice(2, 7);
    expectedServers.unshift(testServers[0]);

    var state = {};
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: {'6.5': '20121211T203034Z',
                           '7.1': '20121211T203034Z'},
            max_platform: {'7.1': '20121219T203452Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_minmax_platform_requirements_5 =
function (t) {
    var expectedServers = testServers.slice(2, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var vmDetails = {};
    var pkgDetails = { min_platform: {'6.5': '20121210T203034Z'} };
    var imgDetails = {
        requirements: {
            min_platform: {'6.5': '20121218T203452Z'},
            max_platform: {'7.1': '20121217T203452Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_ignore_non_versions =
function (t) {
    var expectedServers = testServers.slice(2, 6);
    expectedServers.unshift(testServers[0]);
    expectedServers[expectedServers.length] = testServers[7];

    var state = {};
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: {'6.5': '20121211T203034Z',
                           'smartos': '20121217T203452Z'},
            max_platform: {'7.1': '20121217T203452Z',
                           'smartos': '20121211T203034Z'}
        }
    };

    var filteredServers = filter.run(log, state, testServers, vmDetails,
                                     imgDetails, pkgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_with_no_servers =
function (t) {
    var givenServers = [];
    var vmDetails = {};
    var pkgDetails = {};
    var imgDetails = {};
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails, pkgDetails);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};



function genServers(serverData) {
    var servers = serverData.map(function (data) {
        return { memory_available_bytes: data[0],
                 sysinfo: { 'SDC Version': data[1], 'Live Image': data[2] } };
    });

    return servers;
}