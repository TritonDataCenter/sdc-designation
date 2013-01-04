/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Returns servers which have traits that can fulfill the VM's request.
 *
 * See for more details:
 * https://hub.joyent.com/wiki/display/sdc7/
 *         Server+Roles+and+Server+Allocation+Constraints
 */



function filterTraits(log, state, servers, vmDetails) {
    var requestedTraits = vmDetails.traits;
    if (!requestedTraits)
        return servers;

    var traitNames = Object.keys(requestedTraits);
    if (traitNames.length === 0)
        return servers;

    var adequateServers = servers.filter(function (server) {
        var serverTraits = server.traits;
        if (!serverTraits)
            return false;

        for (var i = 0; i !== traitNames.length; i++) {
            var name = traitNames[i];
            var matched = traitMatch(serverTraits[name], requestedTraits[name]);

            if (!matched)
                return false;
        }

        return true;
    });

    return adequateServers;
}



/*
 * Does some gymnastics to see whether a server's trait can fulfill a VM's
 * trait.
 *
 * Specifically, if the VM's trait is boolean, check if equivalent to
 * server's (i.e. assumes both are then booleans). If the VM trait is a string,
 * check if it's equal or contained within an array in the server trait (the
 * server trait can be either a string or an array). If the VM trait is an
 * array, it only needs to match a single item in that array with a single item
 * in the server array (assumes both are arrays).
 *
 * Messy, huh? Hopefully it makes intuitive sense anyway.
 */

function traitMatch(serverTrait, vmTrait) {
    if (typeof (vmTrait) === 'undefined') // shouldn't happen
        return true;

    if (typeof (serverTrait) === 'undefined')
        return false;

    if (typeof (vmTrait) === 'boolean')
        return serverTrait === vmTrait;

    if (typeof (vmTrait) === 'string') {
        if (typeof (serverTrait) === 'string') {
            return serverTrait === vmTrait;

        } else if (Array.isArray(serverTrait)) {
            if (serverTrait.indexOf(vmTrait) > -1)
                return true;
        }

    } else if (Array.isArray(vmTrait) && Array.isArray(vmTrait)) {
        for (var i = 0; i !== vmTrait.length; i++) {
            if (serverTrait.indexOf(vmTrait[i]) > -1)
                return true;
        }
    }

    return false;
}



module.exports = {
    name: 'Servers with correct traits',
    run: filterTraits
};
