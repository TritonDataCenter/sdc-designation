/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns a random server.
 */



function randomServer(servers) {
    var index = Math.floor(Math.random() * servers.length);
    return servers[index];
}



module.exports = {
    name: 'Random server',
    run: randomServer
};
