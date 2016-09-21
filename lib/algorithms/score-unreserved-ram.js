/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * Increases the scores servers by amount of free RAM available.
 *
 * The range of scores that can be added to servers is determined by
 * weight_unreserved_ram (between 0 and abs(weight)). A positive
 * weight_unreserved_ram will cause servers which have more free RAM
 * (specifically, RAM which has not already been reserved for use by existing
 * zones) to receive higher scores. A negative weight_unreserved_ram does the
 * opposite: servers which have more unreserved RAM have lower score increases.
 *
 * Scoring is affected by server_spread in the defaults (deprecated), as well as
 * alloc_server_spread in the package. If they are set to `min-ram` or
 * `max-ram`, weight_unreserved_ram is overridden with MIN_RAM_WEIGHT or
 * MAX_RAM_WEIGHT respectively.
 */

var assert = require('assert-plus');
var score = require('../scorers').linear;

var MIN_RAM_WEIGHT = 2;
var MAX_RAM_WEIGHT = -2;


function
scoreUnreservedRam(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.defaults, 'opts.defaults');
	assert.object(opts.log, 'opts.log');
	assert.func(cb, 'cb');

	var reasons = {};

	// backwards compat
	var compatWeight = getCompatWeight(opts);
	if (compatWeight === 0) {
		reasons.skip = 'pkg or default set to score with other plugin';
		return (cb(null, servers, reasons));
	}

	var weight = compatWeight || +opts.defaults.weight_unreserved_ram;
	if (!weight) {
		reasons.skip = 'Resolved score weight to 0.00; no changes';
		return (cb(null, servers, reasons));
	}

	// shallow copy to avoid mutating order of referred array
	var sortedServers = servers.slice(0).sort(function (a, b) {
		// we multiply by weight here in order to make weight's sign
		// (negative, positive number) have an effect -- whether the
		// sorting is reversed or not
		return (weight * (a.unreserved_ram - b.unreserved_ram));
	});

	// alter scores; this mutates server objects referred to by both
	// sortedServers and servers
	score(opts.log, sortedServers, Math.abs(weight), reasons);

	return (cb(null, servers, reasons));
}


/*
 * Determine if score weights are affected either by package attributes,
 * or (deprecated) defaults.
 */
function
getCompatWeight(opts)
{
	var pkg = opts.pkg;
	var defaultSpread = opts.defaults.server_spread;
	var spread = (pkg && pkg.alloc_server_spread) || defaultSpread;

	if (spread === undefined) {
		return (null);
	} else if (spread === 'min-ram') {
		return (MIN_RAM_WEIGHT);
	} else if (spread === 'max-ram') {
		return (MAX_RAM_WEIGHT);
	} else {
		return (0);
	}
}


module.exports = {
	name: 'Score servers based on unreserved RAM',
	run: scoreUnreservedRam
};
