/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2019 Joyent, Inc.
 */

/*
 * Transforms affinities into locality hints, and sometimes filters servers as
 * well. Note that this plugin must be followed by hard-filter-locality-hints.js
 * in order for affinities to work.
 *
 * Affinities, like locality hints, are used to control which CN a new VM will
 * be allocated to. Sometimes users want to ensure that a new VM is colocated
 * with an existing VM on a CN, and sometimes users want to guarantee that a VM
 * won't be on the same CN as a set of other CNs.
 *
 * Affinities come as an array with objects in the following format:
 *
 * {
 *     key: KEY,
 *     operator: OPERATOR,
 *     value: VALUE,
 *     valueType: TYPE,
 *     isSoft: BOOLEAN
 * }
 *
 * KEY: "instance", "container", or a VM tag string
 * OPERATOR: "!=" or "=="
 * VALUE: an exact string, a regex string, or glob string
 * TYPE: whether the VALUE is an exact string ("exact"), a glob ("glob") or a
 *       regular expression ("re").
 * BOOLEAN: whether this affinity is mandatory, or can be ignored if it cannot
 *         be fulfilled
 *
 * An example of an affinity that requires the new VM be colocated with any VM
 * that has the tag "purpose": "webserver":
 *
 * {
 *     key: 'purpose',
 *     operator: '==',
 *     value: 'webserver',
 *     valueType: 'exact',
 *     isSoft: false
 * }
 *
 * This plugin converts affinity contraints (e.g. instance alias starts with
 * "foo") to locality hints using VM UUIDs since locality hints only operate
 * with VM UUIDs.
 */

var assert = require('assert-plus');
var converter = require('./shared/affinity');


/**
 * Convert affinities to locality hints (`opts.vm.locality`).
 *
 * @param {Object} servers Array of server objects to filter.
 * @param {Object} opts.vm Details about VM being provisioned.
 * @param {Object} opts.log Bunyan logger.
 * @param {Object} opts.getVm Function to fetch a specific VM from vmapi.
 * @param {Object} opts.listVms Function for searching for VMs in vmapi.
 * @param {Function} cb Return as cb(err, remaining servers, reasons)
 */
function
convertAffinityToLocality(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.func(cb, 'cb');

	var reasons = {};
	var affinity = opts.vm.affinity;

	if (servers.length === 0) {
		cb(null, servers, reasons);
		return;
	}

	if (affinity === undefined) {
		reasons.skip = 'No affinity found';
		cb(null, servers, reasons);
		return;
	}

	var ownerUuid = opts.vm.owner_uuid;
	assert.uuid(ownerUuid, 'opts.vm.owner_uuid');

	var args = {
		log: opts.log,
		affinity: affinity,
		ownerUuid: ownerUuid,
		vmapi: {
			getVm: opts.getVm,
			listVms: opts.listVms
		}
	};

	converter.localityFromAffinity(args, function affCb(err, locality) {
		if (err) {
			reasons['*'] = err;
			cb(null, [], reasons);
			return;
		}

		if (!locality) {
			cb(null, servers, reasons);
			return;
		}

		opts.vm.locality = locality;

		cb(null, servers, reasons);
		return;
	});
}

module.exports = {
	name: 'Convert affinity to locality hints',
	run: convertAffinityToLocality
};
