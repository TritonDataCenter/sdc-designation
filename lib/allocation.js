/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */


var restify = require('restify');
var common = require('./common');
var algorithms = require('./algorithms');



/*
 * Validates the servers parameter for correct JSON and input and correct
 * server objects
 */
function validateServers(req, res, next) {
  req.log.trace('validateServers start');

  var validServers = [];
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
      if (common.validServer(server)) {
        validServers.push(server);
      }
    } catch (err) {
      return next(err);
    }
  }

  if (!validServers.length) {
    new restify.InvalidArgumentError('No valid servers provided');
  }

  req.servers = validServers;
  return next();
}



/*
 * Allocates a server. Initially choose a random server from the servers input.
 * Eventually we want to apply custom allocation algorithms.
 *
 * Right now there is no config setting to enable another algorithm.
 */
function allocate(req, res, next) {
  req.log.trace('Alocation start');

  var servers = req.servers;
  // In the future we will have algorithms that don't return a server.
  var server = algorithms.mostAvailableRam(servers);

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
