/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers which have traits that can fulfill the VM package and
 * image manifest.
 *
 * See for more details:
 * https://hub.joyent.com/wiki/display/sdc7/
 *    Server+Roles+and+Server+Allocation+Constraints
 */

function
filterTraits(log, state, servers, constraints)
{
	var reasons = constraints.capacity ? null : {};
	var imgTraits = constraints.img.traits;
	var vmTraits  = (constraints.vm.traits
		|| constraints.pkg && constraints.pkg.traits);
	var requestedTraits = mergeTraits(vmTraits, imgTraits);
	var traitNames;
	var adequateServers;

	if (!requestedTraits)
		return (traitless(servers, reasons));

	traitNames = Object.keys(requestedTraits);
	if (traitNames.length === 0)
		return (traitless(servers, reasons));

	log.trace('Filtering with VM traits:', requestedTraits);

	adequateServers = servers.filter(function (server) {
		var serverTraits = server.traits;

		if (!serverTraits ||
		    traitNames.length !== Object.keys(serverTraits).length) {
			if (reasons) {
				var msg = 'Combined vm/pkg/img traits ' +
				    'require ' +
				    JSON.stringify(requestedTraits) +
				    ' but server has ' +
				    JSON.stringify(serverTraits);
				reasons[server.uuid] = msg;
			}

			return (false);
		}

		for (var i = 0; i !== traitNames.length; i++) {
			var name = traitNames[i];
			var errMsg = traitMatch(serverTraits[name],
			    requestedTraits[name]);

			if (errMsg) {
				errMsg = name + ' comparison failed: ' + errMsg;
				log.trace('Skipping server',
				    server.UUID, 'because', errMsg);

				if (reasons)
					reasons[server.uuid] = errMsg;

				return (false);
			}
		}

		return (true);
	});

	return ([adequateServers, reasons]);
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
function
traitMatch(serverTrait, vmTrait)
{
	if (serverTrait === undefined || vmTrait === undefined)
		return ('undefined property');

	if (typeof (vmTrait) === 'boolean') {
		if (serverTrait === vmTrait)
			return (null);
		return ('boolean did not match');
	}

	if (typeof (vmTrait) === 'string') {
		if (typeof (serverTrait) === 'string') {
			if (serverTrait === vmTrait)
				return (null);
			return ('strings did not match');
		}

		if (Array.isArray(serverTrait)) {
			if (serverTrait.indexOf(vmTrait) > -1)
				return (null);
			return ('server trait array did not contain trait');
		}

		return ('unsupported combination of property types');
	}

	if (Array.isArray(vmTrait)) {
		if (typeof (serverTrait) === 'string') {
			if (vmTrait.indexOf(serverTrait) > -1)
				return (null);
			return ('server trait was not in ' +
			    'requested trait array');
		}

		if (Array.isArray(serverTrait)) {
			for (var i = 0; i !== vmTrait.length; i++) {
				if (serverTrait.indexOf(vmTrait[i]) > -1)
					return (null);
			}
			return ('server and requested trait arrays ' +
			    'do not intersect');
		}
	}

	return ('unsupported combination of property types');
}

/*
 * Returns servers that don't have trait entries.
 */
function
traitless(servers, reasons)
{
	var traitlessServers = servers.filter(function (server) {
		var isTraitless = server.traits === undefined ||
		    Object.keys(server.traits).length === 0;

		if (reasons && !isTraitless) {
			reasons[server.uuid] =
			    'Combined vm/pkg/img require no traits ' +
			    'but server has ' + JSON.stringify(server.traits);
		}

		return (isTraitless);
	});

	return ([traitlessServers, reasons]);
}

/*
 * Takes two hashes and returns a union of the two. The traits in the image
 * manifest can override traits in the VM package, so the image values take
 * precedence.
 */
function
mergeTraits(vmTraits, imgTraits)
{
	var traitName;
	var requestedTraits = {};

	if (!(vmTraits || imgTraits))
		return (null);

	if (!vmTraits && imgTraits)
		return (imgTraits);

	if (vmTraits && !imgTraits)
		return (vmTraits);

	/* no mutation of values, so shallow copy is sufficient */
	for (traitName in vmTraits)
		requestedTraits[traitName] = vmTraits[traitName];

	/*
	 * image manifest traits can override VM package traits,
	 * so strait a copy is fine
	 */
	for (traitName in imgTraits)
		requestedTraits[traitName] = imgTraits[traitName];

	return (requestedTraits);
}

module.exports = {
	name: 'Servers with correct traits',
	run: filterTraits,
	affectsCapacity: true
};
