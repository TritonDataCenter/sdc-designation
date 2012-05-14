/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */

var assert = require('assert');
var restify = require('restify');

var UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;



function validUUID(uuid) {
  return UUID_RE.test(uuid);
}


/*
 * Validates if server is a valid server object.
 * Pretty simple validation at the moment: just check for ram and UUID.
 *
 * uuid: 564d89c4-e368-1a0b-564f-b8a33f47c134
 * hostname: headnode
 * memory_total_bytes: 2943930368
 * memory_available_bytes: 1544368128
 * reserved: true
 * cpucores: 2
 * os: 20120319T230411Z
 * cpuvirtualization: none
 * status: running
 * headnode: true
 */
function validServer(server) {
  assert.ok(server);

  if (!server.uuid)
    throw new restify.InvalidArgumentError('Server does not have a UUID');

  if (!validUUID(server.uuid))
    throw new restify.InvalidArgumentError('Server does not have a valid UUID');

  if (!server.memory_available_bytes)
    throw new restify.MissingParameterError(
              'Server does not have a memory_available_bytes attribute');

  if (!server.memory_total_bytes)
    throw new restify.MissingParameterError(
              'Server does not have a memory_total_bytes attribute');

  return true;
}



module.exports = {

  validServer: validServer

};
