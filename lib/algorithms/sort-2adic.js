/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Sorts servers according to the 2adic ranking using free RAM on a server
 * and the requested RAM. The returned result is in order of preference (first
 * being highest).
 */



/*
 * Sorts servers by their 2adic ranking using available RAM and requested RAM.
 *
 * Uses a schwarzian transform.
 */
function sort2Adic(servers, requestedRam) {
    var reqRamInBytes = requestedRam * 1024 * 1024;
    var serversEnoughSpace = servers.filter(function (server) {
        var availRam = server.memory_available_bytes;
        return availRam >= reqRamInBytes;
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
