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
    var adics = servers.map(function (server) {
        var availRam = server.memory_available_bytes;
        var hexRatio = Math.floor(availRam / requestedRam).toString(2);
        var adic = hexRatio.split('').reverse().join('');
        return [adic, server];
    });

    var sortedAdics = adics.sort(function (i, j) {
        return i[0] > j[0];
    });

    var sortedServers = sortedAdics.map(function (adic) {
        return adic[1];
    });

    return sortedServers;
}



module.exports = {
    name: 'Sorts servers by 2adic',
    run: sort2Adic
};
