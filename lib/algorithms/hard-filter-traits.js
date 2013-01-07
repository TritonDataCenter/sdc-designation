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
        return traitless(servers);

    var traitNames = Object.keys(requestedTraits);
    if (traitNames.length === 0)
        return traitless(servers);

    if (log.trace())
        log.trace('Filtering with VM traits:', requestedTraits);

    var adequateServers = servers.filter(function (server) {
        var serverTraits = server.traits;
        if (!serverTraits)
            return false;

        if (traitNames.length !== Object.keys(serverTraits).length)
            return false;

        for (var i = 0; i !== traitNames.length; i++) {
            var name = traitNames[i];
            var errMsg = traitMatch(serverTraits[name], requestedTraits[name]);

            if (errMsg) {
              if (log.trace())
                  log.trace('Skipping server', server.UUID, 'because',
                            name, 'comparison failed:', errMsg);
              return false;
            }
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
    if (serverTrait === undefined || vmTrait === undefined)
        return 'undefined property';

    if (typeof (vmTrait) === 'boolean') {
        if (serverTrait === vmTrait)
            return null;
        return 'boolean did not match';
    }

    if (typeof (vmTrait) === 'string') {
        if (typeof (serverTrait) === 'string') {
            if (serverTrait === vmTrait)
                return null;
            return 'strings did not match';
        }

        if (Array.isArray(serverTrait)) {
            if (serverTrait.indexOf(vmTrait) > -1)
                return null;
            return 'server trait array did not contain trait';
        }

        return 'unsupported combination of property types';
    }

    if (Array.isArray(vmTrait) && Array.isArray(vmTrait)) {
        for (var i = 0; i !== vmTrait.length; i++) {
            if (serverTrait.indexOf(vmTrait[i]) > -1)
                return null;
        }
        return 'server and vm trait arrays do not intersect';
    }

    return 'unsupported combination of property types';
}



/*
 * Returns objects that don't have trait entries.
 */

function traitless(objs) {
    var traitlessObjs = objs.filter(function (obj) {
        return obj.traits === undefined || Object.keys(obj.traits).length === 0;
    });

    return traitlessObjs;
}



module.exports = {
    name: 'Servers with correct traits',
    run: filterTraits
};
