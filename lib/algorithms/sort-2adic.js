/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Sorts servers according to the 2adic ranking using free RAM on a server
 * and the requested RAM. The returned result is in order of preference (first
 * being highest).
 *
 * Theory: https://hub.joyent.com/wiki/display/support/Selecting+the+server+\
 *         for+a+new+Zone%2C+part+II
 */



/*
 * Sorts servers by their 2adic ranking using available RAM and requested RAM.
 *
 * Uses a schwarzian transform.
 *
 * We filter out servers that have less available RAM that the requested RAM
 * (thus making overprovisioning RAM impossible) because 2adic ordering breaks
 * down in that case.
 */
function sort2Adic(log, state, servers, requestedRam) {
    var reqRamInBytes = requestedRam * 1024 * 1024;
    var serversEnoughSpace = servers.filter(function (server) {
        var availRam = server.memory_available_bytes;

        if (availRam < reqRamInBytes) {
            log.trace('Discarded %s because it was too small', server.uuid);
            return false;
        }

        return true;
    });

    var adics = serversEnoughSpace.map(function (server) {
        var availRam = server.memory_available_bytes / 1024 / 1024;
        var hexRatio = Math.floor(availRam / requestedRam).toString(2);
        var adicFractional = hexRatio.split('').reverse().join('');
        var adic = +('0.' + adicFractional);

        return [adic, server];
    });

    var sortedAdics = adics.sort(function (i, j) {
        return j[0] - i[0];
    });

    var sortedServers = sortedAdics.map(function (adic) {
        return adic[1];
    });

    return sortedServers;
}



module.exports = {
    name: 'Sort servers by 2adic',
    run: sort2Adic
};
