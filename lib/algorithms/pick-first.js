/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns the first server in the given array of servers.
 */



function pickFirst(servers) {
    return servers[0];
}



module.exports = {
    name: 'Returns first server',
    run: pickFirst
};
