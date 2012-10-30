/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */


var restify = require('restify');
var common = require('./common');
var algorithms = require('./algorithms');



/*
 * Validates the 'vm' payload parameter for correct JSON and input and correct
 * server objects
 */
function validateVmPayload(req, res, next) {
    req.log.trace('validateVmPayload start');

    var vm = req.params.vm;

    if (!vm)
        return next(new restify.MissingParameterError('\'vm\' is required'));

    try {
        common.validVm(vm);
    } catch (err) {
        return next(err);
    }

    req.vm = vm;
    return next();
}


/*
 * Validates the servers parameter for correct JSON and input and correct
 * server objects
 */
function validateServers(req, res, next) {
    req.log.trace('validateServers start');

    var validServers = [];
    var servers = req.params.servers;

    if (!servers) {
        return next(
            new restify.MissingParameterError('\'servers\' are required'));
    }

    if (!Array.isArray(servers)) {
        return next(
        new restify.MissingParameterError('\'servers\' input is not an array'));
    }

    if (!servers.length) {
        return next(
            new restify.MissingParameterError('\'servers\' array is empty'));
    }

    for (var i = 0; i < servers.length; i++) {
        var server = servers[i];
        try {
            if (common.validServer(server))
                validServers.push(server);
        } catch (err) {
            return next(err);
        }
    }

    if (!validServers.length) {
        return next(
            new restify.InvalidArgumentError('No valid \'servers\' found'));
    }

    req.servers = validServers;
    return next();
}



/*
 * Allocates a server
 */
function allocate(req, res, next) {
    req.log.trace('Allocation start');

    var vm = req.params.vm;
    var server = algorithms.allocate(req.log, req.algorithms, req.servers,
                                     vm.ram, vm.nic_tags);

    if (!server) {
        return next(
            new restify.
                InvalidArgumentError('No allocatable \'servers\' found'));
    }

    res.send(server);
    return next();
}



/*
 * Mounts allocation endpoints
 */
function mount(server, before) {
    server.post({ path: '/allocation', name: 'Allocation'},
                  before,
                  validateVmPayload,
                  validateServers,
                  allocate);
}


// --- Exports

module.exports = {
    mount: mount
};
