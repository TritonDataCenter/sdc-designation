/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns the server with the most free memory for allocation.
 */



function mostAvailableRam(servers) {
    var maxRam = -1;
    var maxIndex = -1;

    for (var i = 0; i < servers.length; i++) {
        var availRam = servers[i].memory_available_bytes;

        if (availRam > maxRam) {
            maxRam = availRam;
            maxIndex = i;
        }
    }

    return servers[maxIndex];
}



module.exports = {
    name: 'Most available RAM',
    run: mostAvailableRam
};
