/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers objects which pass validation.
 */



var validations = require('../validations');



function filterInvalidServers(log, state, servers) {
    var validServers = servers.filter(function (server) {
        var msg = validations.validateServer(server);

        if (msg)
            log.warn('Skipping server in request:', msg);


        return !msg;
    });

    return validServers;
}



module.exports = {
    name: 'Servers objects which are valid',
    run: filterInvalidServers
};
