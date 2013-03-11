/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-platform-versions.js');

var log = { trace: function () { return true; },
            debug: function () { return true; } };



exports.filterPlatformVersions_no_platform_requirements =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, current_platform: '20121218T203452Z' },
        { memory_available_bytes: 384, current_platform: '20121210T203034Z' },
        { memory_available_bytes: 768, current_platform: '20121322T122401Z' }
    ];

    var state = {};
    var expectedServers = givenServers;
    var vmDetails = {};
    var imgDetails = {};

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_65_platform_requirements =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, current_platform: '20121218T203452Z' },
        { memory_available_bytes: 384, current_platform: '20121210T203034Z' },
        { memory_available_bytes: 768, current_platform: '20130122T122401Z' }
    ];

    var state = {};
    var expectedServers = givenServers;
    var vmDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: [['6.5', '20121211T203034Z']],
            max_platform: [['6.5', '20130101T203034Z']]
        }
    };

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_min_platform =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, current_platform: '20121218T203452Z' },
        { memory_available_bytes: 384, current_platform: '20121210T203034Z' },
        { memory_available_bytes: 768, current_platform: '20130122T122401Z' }
    ];

    var state = {};
    var expectedServers = [givenServers[0], givenServers[2]];
    var vmDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: [['7.0', '20121211T203034Z']]
        }
    };

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_max_platform =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, current_platform: '20121218T203452Z' },
        { memory_available_bytes: 384, current_platform: '20121210T203034Z' },
        { memory_available_bytes: 768, current_platform: '20130122T122401Z' }
    ];

    var state = {};
    var expectedServers = givenServers.slice(0, 2);
    var vmDetails = {};
    var imgDetails = {
        requirements: {
            max_platform: [['7.0', '20130101T000000Z']]
        }
    };

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_min_max_platform =
function (t) {
    var givenServers = [
        { memory_available_bytes: 128, current_platform: '20121218T203452Z' },
        { memory_available_bytes: 384, current_platform: '20121210T203034Z' },
        { memory_available_bytes: 768, current_platform: '20130122T122401Z' }
    ];

    var state = {};
    var expectedServers = givenServers.slice(0, 1);
    var vmDetails = {};
    var imgDetails = {
        requirements: {
            min_platform: [['7.0', '20121211T203034Z']],
            max_platform: [['7.0', '20130101T000000Z']]
        }
    };

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails);
    t.deepEqual(filteredServers, expectedServers);
    t.deepEqual(state, {});

    t.done();
};



exports.filterPlatformVersions_with_no_servers =
function (t) {
    var givenServers = [];
    var imgDetails = {};
    var vmDetails = {};
    var state = {};

    var filteredServers = filter.run(log, state, givenServers, vmDetails,
                                     imgDetails);

    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};



exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};
