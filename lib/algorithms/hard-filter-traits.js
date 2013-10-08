/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers which have traits that can fulfill the VM package and
 * image manifest.
 *
 * See for more details:
 * https://hub.joyent.com/wiki/display/sdc7/
 *         Server+Roles+and+Server+Allocation+Constraints
 */



function filterTraits(log, state, servers, constraints) {
    var imgTraits = constraints.img.traits;
    var vmTraits  = constraints.vm.traits || constraints.pkg.traits;

    var requestedTraits = mergeTraits(vmTraits, imgTraits);
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
 * Does some gymnastics to see whether a server's trait can fulfill the
 * requested traits.
 *
 * Specifically, if the requested trait is boolean, check if equivalent to
 * server's (i.e. assumes both are then booleans). If the requested trait is a
 * string, check if it's equal or contained within an array in the server trait
 * (the server trait can be either a string or an array). If the requested trait
 * is an array, it only needs to match a single item in that array with a single
 * item in the server array (assumes both are arrays).
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

    if (Array.isArray(vmTrait)) {
        if (typeof (serverTrait) === 'string') {
            if (vmTrait.indexOf(serverTrait) > -1)
                return null;
            return 'server trait was not in requested trait array';
        }

        if (Array.isArray(serverTrait)) {
            for (var i = 0; i !== vmTrait.length; i++) {
                if (serverTrait.indexOf(vmTrait[i]) > -1)
                    return null;
            }
            return 'server and requested trait arrays do not intersect';
        }
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



/*
 * Takes two hashes and returns a union of the two. The traits in the image
 * manifest can override traits in the VM package, so the image values take
 * precedence.
 */

function mergeTraits(vmTraits, imgTraits) {
    if (!(vmTraits || imgTraits))
        return null;

    if (!vmTraits && imgTraits)
        return imgTraits;

    if (vmTraits && !imgTraits)
        return vmTraits;

    var traitName;
    var requestedTraits = {};

    // no mutation of values, so shallow copy is sufficient
    for (traitName in vmTraits)
        requestedTraits[traitName] = vmTraits[traitName];

    // image manifest traits can override VM package traits, so strait a copy
    // is fine
    for (traitName in imgTraits)
        requestedTraits[traitName] = imgTraits[traitName];

    return requestedTraits;
}



module.exports = {
    name: 'Servers with correct traits',
    run: filterTraits
};
