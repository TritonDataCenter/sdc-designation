/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns the server with the most free memory for allocation.
 */



function highest2Adic(servers, requestedRam) {
    var bestAdic = '';
    var maxIndex = -1;

    for (var i = 0; i < servers.length; i++) {
        var availRam = servers[i].memory_available_bytes;

        var hexRatio = Math.floor(availRam / requestedRam).toString(2);
        var adic = hexRatio.split('').reverse().join('');

        if (adic > bestAdic) {
            bestAdic = adic;
            maxIndex = i;
        }
    }

    return servers[maxIndex];
}



module.exports = {
    name: 'Highest 2adic',
    run: highest2Adic
};
