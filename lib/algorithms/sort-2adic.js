/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Sorts servers according to the 2adic ranking using unreserved RAM on a server
 * and the requested RAM. The returned result is in order of preference (first
 * being highest).
 *
 * 2adic ordering has some problems in non-n^2 cases, but for servers and VMs
 * that have n^2 RAM it packs the VMs so that more valuable sizes
 * (e.g. 8GiB free) are preserved longer.
 *
 * Theory: https://hub.joyent.com/wiki/display/support/Selecting+the+server+\
 *         for+a+new+Zone%2C+part+II
 */



/*
 * Sorts servers by their 2adic ranking using unreserved RAM and requested RAM.
 *
 * Uses a schwarzian transform.
 *
 * We filter out servers that have less unreserved RAM that the requested RAM
 * (thus making overprovisioning RAM impossible) because 2adic ordering breaks
 * down in that case.
 */
function sort2Adic(log, state, servers, requestedRam) {
    var serversEnoughSpace = servers.filter(function (server) {
        if (server.unreserved_ram < requestedRam) {
            log.trace('Discarded %s because it was too small', server.uuid);
            return false;
        }

        return true;
    });

    var adics = serversEnoughSpace.map(function (server) {
        var unreservedRam = server.unreserved_ram;
        var hexRatio = Math.floor(unreservedRam / requestedRam).toString(2);
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
