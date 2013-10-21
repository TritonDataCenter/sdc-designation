/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers objects which pass validation.
 */



var validations = require('../validations');



function filterInvalidServers(log, state, servers, constraints) {
    var reasons = constraints.capacity ? null : {};

    var validServers = servers.filter(function (server) {
        var msg = validations.validateServer(server);

        if (msg)
            log.warn('Skipping server in request:', msg);

        if (msg && reasons)
            reasons[server.uuid] = msg;

        return !msg;
    });

    return [validServers, reasons];
}



module.exports = {
    name: 'Servers objects which are valid',
    run: filterInvalidServers,
    affectsCapacity: true
};
