/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

/* Test the Boilerplate API endpoints */

var uuid = require('node-uuid');
var assert = require('assert');

var common = require('./common');


// --- Globals

var client;


// --- Helpers


// --- Tests

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
    var theUuid = uuid();
    var otherUuid = uuid();

    var servers = [ {
        uuid: uuid()
    }, {
        uuid: otherUuid,
        ram: 2048,
        setup: true,
        memory_total_bytes: 2147483648,
        memory_available_bytes: 1073741824
    }, {
        uuid: theUuid,
        ram: 1024,
        setup: true,
        memory_total_bytes: 1073741824,
        memory_available_bytes: 536870912
    } ];

    var data = { servers: servers, vm: { ram: 256 } };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.equal(body.uuid, otherUuid);
        t.done();
    });
};



exports.allocation_not_ok = function (t) {
    var path = '/allocation';
    var theUuid = uuid();
    var otherUuid = uuid();

    var servers = [ {
        uuid: uuid()
    }, {
        uuid: otherUuid,
        ram: 2048,
        memory_total_bytes: 2147483648,
        memory_available_bytes: 1073741824
    }, {
        uuid: theUuid,
        ram: 1024,
        memory_total_bytes: 1073741824,
        memory_available_bytes: 536870912
    } ];

    var data = { servers: servers, vm: { ram: 2048 } };

    client.post(path, data, function (err, req, res, body) {
        t.equal(res.statusCode, 409);
        common.checkHeaders(t, res.headers);
        t.ok(body);
        t.done();
    });
};
