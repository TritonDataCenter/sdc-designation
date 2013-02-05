/*
 * Copyright 2011 Joyent, Inc.  All rights reserved.
 *
 * Grab-bag of common functions.
 */



var assert = require('assert');
var crypto = require('crypto');

var Logger = require('bunyan');
var restify = require('restify');
var uuid = require('node-uuid');



module.exports = {

    setup: function (callback) {
        assert.ok(callback);

        var logger = new Logger({
            level: process.env.LOG_LEVEL || 'info',
            name: 'dapi_unit_test',
            stream: process.stderr,
            serializers: restify.bunyan.serializers
        });

        var client = restify.createJsonClient({
            url: 'http://localhost:8080',
            version: '*',
            retryOptions: { retry: 0 },
            agent: false,
            log: logger
        });

        return callback(null, client);
    },

    checkHeaders: function (t, headers) {
        assert.ok(t);

        t.ok(headers);
        t.ok(headers.date);
        t.equal(headers['content-type'], 'application/json');
        t.equal(headers['api-version'], '7.0.0');
        t.ok(headers['request-id']);
        t.ok(headers['response-time'] >= 0);
        t.ok(headers['content-length'] >= 0);
    }

};
