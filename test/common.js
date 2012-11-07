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
            serializers: {
                err: Logger.stdSerializers.err,
                req: Logger.stdSerializers.req,
                res: restify.bunyan.serializers.response
            }
        });

        var client = restify.createJsonClient({
            url: 'http://localhost:8080',
            version: '*',
            retryOptions: {
                retry: 0
            },
            log: logger
        });

        return callback(null, client);
    },

    checkHeaders: function (t, headers) {
        assert.ok(t);

        t.ok(headers);
        t.ok(headers['access-control-allow-origin']);
        t.ok(headers['access-control-allow-methods']);
        t.ok(headers.date);
        t.ok(headers['x-request-id']);
        t.ok(headers['x-response-time'] >= 0);
        t.equal(headers.server, 'Designation API');
        t.equal(headers.connection, 'Keep-Alive');
        // t.equal(headers['x-api-version'], '7.0.0');
    }

};
