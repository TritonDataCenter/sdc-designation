/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */



function mostAvailableRam(servers) {
    var maxRam = -1;
    var maxIndex = -1;
    var i;

    for (i = 0; i < servers.length; i++) {
        if (servers[i].memory_available_bytes > maxRam) {
            maxRam = servers[i].memory_available_bytes;
            maxIndex = i;
        }
    }

    return servers[maxIndex];
}

module.exports = {
    name: 'Most available RAM',
    run: mostAvailableRam
};
