/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */



var filter = require('../../lib/algorithms/soft-filter-locality-hints.js');
var genUuid = require('node-uuid');

var log = { trace: function () { return true; },
            debug: function () { return true; } };

var ownerUuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';



exports.filter_default_locality_with_rack_free =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var expected = servers.slice(2, 4);
    var vmDetails = { owner_uuid: ownerUuid };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_default_locality_with_no_rack_free =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 3) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 2) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var expected = servers.slice(1, 2);
    var vmDetails = { owner_uuid: ownerUuid };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_default_locality_with_no_rack_or_server_free =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 3) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 2) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var expected = servers;
    var vmDetails = { owner_uuid: ownerUuid };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_far_locality_with_rack_free =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var vms = servers[2].vms;
    var far = Object.keys(vms).filter(function (uuid) {
        return vms[uuid].owner_uuid === ownerUuid;
    });

    var expected = servers.slice(0, 2);
    var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_far_locality_with_no_rack_free =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var ownerVms = [servers[0], servers[2]].map(function (s) {
        return s.vms;
    }).map(function (vms) {
        return Object.keys(vms).filter(function (uuid) {
            return vms[uuid].owner_uuid === ownerUuid;
        });
    });

    var far = [].concat.apply([], ownerVms);

    var expected = [servers[1], servers[3], servers[4]];
    var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

    filterServers(t, vmDetails, servers, expected);
};




exports.filter_far_locality_with_no_rack_or_server_free =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var ownerVms = servers.map(function (s) {
        return s.vms;
    }).map(function (vms) {
        return Object.keys(vms).filter(function (uuid) {
            return vms[uuid].owner_uuid === ownerUuid;
        });
    });

    var far = [].concat.apply([], ownerVms);

    var expected = servers;
    var vmDetails = { owner_uuid: ownerUuid, locality: { far: far } };

    filterServers(t, vmDetails, servers, expected);
};




exports.filter_near_locality_with_free_server_in_rack =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var ownerVms = servers.slice(0, 1).map(function (s) {
        return s.vms;
    }).map(function (vms) {
        return Object.keys(vms).filter(function (uuid) {
            return vms[uuid].owner_uuid === ownerUuid;
        });
    });

    var near = [].concat.apply([], ownerVms);

    var expected = servers.slice(1, 2);
    var vmDetails = { owner_uuid: ownerUuid, locality: { near: near } };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_near_locality_with_no_free_servers_in_rack =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var ownerVms = servers.slice(0, 2).map(function (s) {
        return s.vms;
    }).map(function (vms) {
        return Object.keys(vms).filter(function (uuid) {
            return vms[uuid].owner_uuid === ownerUuid;
        });
    });

    var near = [].concat.apply([], ownerVms);

    var expected = servers.slice(0, 2);
    var vmDetails = { owner_uuid: ownerUuid, locality: { near: near } };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_locality_near_and_far =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 1) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 0) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var ownerVms = servers.slice(0, 3).map(function (s) {
        return s.vms;
    }).map(function (vms) {
        return Object.keys(vms).filter(function (uuid) {
            return vms[uuid].owner_uuid === ownerUuid;
        });
    });

    var near = [].concat.apply([], ownerVms);

    ownerVms = [servers[0], servers[2]].map(function (s) {
        return s.vms;
    }).map(function (vms) {
        return Object.keys(vms).filter(function (uuid) {
            return vms[uuid].owner_uuid === ownerUuid;
        });
    });

    var far = [].concat.apply([], ownerVms);


    var expected = servers.slice(3, 4);
    var vmDetails = { owner_uuid: ownerUuid,
                      locality: { near: near, far: far } };

    filterServers(t, vmDetails, servers, expected);
};




exports.filter_locality_with_strings =
function (t) {
    var servers = [
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 2) },
        { uuid: genUuid(), rack_identifier: 'r01', vms: genVms(3, 0) },

        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },
        { uuid: genUuid(), rack_identifier: 'r02', vms: genVms(3, 1) },

        { uuid: genUuid(),                         vms: genVms(3, 2) }
    ];

    var vms = servers[2].vms;
    var far = Object.keys(vms).filter(function (uuid) {
        return vms[uuid].owner_uuid === ownerUuid;
    });

    var expected = servers.slice(0, 2);
    var vmDetails = { owner_uuid: ownerUuid, locality: { far: far[0] } };

    filterServers(t, vmDetails, servers, expected);
};



exports.filter_with_no_servers =
function (t) {
    var state = {};
    var filteredServers = filter.run(log, state, [], { owner_uuid: ownerUuid });
    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    filteredServers = filter.run(log, state, [],
                                 { owner_uuid: ownerUuid,
                                   locality: { near: genUuid() } });
    t.equal(filteredServers.length, 0);
    t.deepEqual(state, {});

    t.done();
};


exports.name =
function (t) {
    t.ok(typeof (filter.name) === 'string');
    t.done();
};



function genVms(numVms, numOwnerVms) {
    var vms = {};

    for (var i = 0; i !== numOwnerVms; i++) {
        vms[genUuid()] = { owner_uuid: ownerUuid };
    }

    for (i = 0; i !== numVms - numOwnerVms; i++) {
        vms[genUuid()] = { owner_uuid: genUuid() };
    }

    return vms;
}



function sortServers(servers) {
    return servers.sort(function (a, b) {
        return (a.uuid > b.uuid ? 1 : -1);  // assuming server UUIDs are unique
    });
}



function filterServers(t, vmDetails, servers, expectedServers) {
    var state = {};

    var filteredServers = filter.run(log, state, servers, vmDetails);

    t.deepEqual(sortServers(filteredServers), sortServers(expectedServers));
    t.deepEqual(state, {});

    t.done();
}
