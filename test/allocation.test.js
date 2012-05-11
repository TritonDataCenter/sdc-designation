/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

/* Test the Boilerplate API endpoints */

var test = require('tap').test;
var uuid = require('node-uuid');

var common = require('./common');


// --- Globals

var client;


// --- Helpers


// --- Tests

test('setup', function (t) {
  common.setup(function (err, _client) {
    t.ifError(err);
    t.ok(_client);
    client = _client;
    t.end();
  });
});



test('Alocation OK', function (t) {
  var path = '/allocation';
  var theUuid = uuid();
  var otherUuid = uuid();

  var servers = [ {
      uuid: theUuid,
      memorytotalbytes: 1073741824,
      memoryavailablebytes: 536870912
  }, {
      uuid: otherUuid,
      ram: 2048,
      memorytotalbytes: 2147483648,
      memoryavailablebytes: 1073741824
  } ];

  var data = { servers: JSON.stringify(servers) };

  client.post(path, data, function (err, req, res, body) {
    t.ifError(err);
    t.equal(res.statusCode, 200);
    common.checkHeaders(t, res.headers);
    t.ok(body);
    t.equal(body.uuid, otherUuid);
    t.end();
  });
});



test('teardown', function (t) {
  client.teardown(function (err) {
    t.ifError(err);
    t.end();
  });
});
