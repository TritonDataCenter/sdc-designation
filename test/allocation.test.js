/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

/* Test the Boilerplate API endpoints */

var uuid = require('node-uuid');
var assert = require('assert');
var common = require('./common');



var client;
var servers = [ {
    uuid: uuid(),
    ram: 2048,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 2147483648,
    memory_available_bytes: 1073741824,
    sysinfo: {
        'Network Interfaces': {
            e1000g0: {
                'Link Status': 'up',
                'NIC Names': [ 'external' ]
            },
            e1000g1: {
               'Link Status': 'up',
               'NIC Names': [ 'admin' ]
            }
        }
    }
}, {
    uuid: uuid(),
    ram: 1024,
    setup: true,
    reserved: false,
    status: 'running',
    memory_total_bytes: 1073741824,
    memory_available_bytes: 536870912,
    sysinfo: {
        'Network Interfaces': {
            e1000g0: {
                'Link Status': 'up',
                'NIC Names': [ 'external' ]
            },
            e1000g1: {
               'Link Status': 'up',
               'NIC Names': [ 'admin' ]
            }
        }
    }
} ];



exports.setUp =  function (callback) {
    common.setup(function (err, _client) {
        assert.ifError(err);
        assert.ok(_client);
        client = _client;
        callback();
    });
};



exports.allocation_ok = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { ram: 256, nic_tags: [ 'external' ] } };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.equal(body.uuid, servers[1].uuid);
        t.done();
    });
};



exports.allocation_not_enough_ram = function (t) {
    var path = '/allocation';

    var data = { servers: servers,
                 vm: { ram: 2048, nic_tags: [ 'external' ] } };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.done();
    });
};
