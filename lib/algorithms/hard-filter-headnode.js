/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Filters out headnodes from server selection.
 */



function filterHeadnode(log, state, servers) {
    var adequateServers = servers.filter(function (server) {
        return ! server.headnode;
    });

    return adequateServers;
}



module.exports = {
    name: 'Servers which are not headnodes',
    run: filterHeadnode
};
