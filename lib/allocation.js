/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */


var restify = require('restify');
var common = require('./common');


/*
 * Simple randNumber to choose a random server from the list
 */
function randNumber(limit) {
  return Math.floor(Math.random() * limit);
}


/*
 * Validates the servers parameter for correct JSON and input and correct
 * server objects
 */
function validateServers(req, res, next) {
  req.log.trace('validateServers start');

  var servers = req.params.servers;

  if (!servers)
    return next(new restify.MissingParameterError('Servers are required'));

  try {
    servers = JSON.parse(servers);
  } catch (e) {
    return next(
           new restify.InvalidArgumentError('Malformed servers JSON input'));
  }

  if (!Array.isArray(servers))
    return next(
           new restify.MissingParameterError('Servers input is not an array'));

  if (!servers.length)
    return next(new restify.MissingParameterError('Servers array is empty'));

  for (var i = 0; i < servers.length; i++) {
    var server = servers[i];
    try {
      common.validServer(server);
    } catch (err) {
      return next(err);
    }
  }

  req.servers = servers;
  return next();
}



/*
 * Allocates a server. Initially choose a random server from the servers input.
 * Eventually we want to apply custom allocation algorithms.
 */
function allocate(req, res, next) {
  req.log.trace('Alocation start');

  var servers = req.servers;
  var server = servers[randNumber(servers.length)];

  res.send(server);
  return next();
}



/*
 * Mounts allocation endpoints
 */
function mount(server, before) {
  server.post({ path: '/allocation', name: 'Allocation'},
               before,
               validateServers,
               allocate);
}


// --- Exports

module.exports = {
   mount: mount
};
