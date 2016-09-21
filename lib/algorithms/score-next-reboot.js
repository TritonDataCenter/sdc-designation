/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * Increase the scores of servers based on when their next reboot date is.
 *
 * Servers are placed into week-wide buckets, and all servers in the
 * same bucket get the same score increase.
 *
 * The range of scores that can be added to servers is determined by
 * weight_next_reboot (between 0 and abs(weight)). A positive weight_next_reboot
 * will cause servers which are scheduled to be rebooted sooner to receive lower
 * scores. A negative weight_next_reboot does the opposite: servers which will
 * be rebooted sooner receive higher score increases.
 */

var assert = require('assert-plus');
var score = require('../scorers').linearBuckets;


var WEEK = 7 * 24 * 60 * 60 * 1000; // in ms


function
scoreNextReboot(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.defaults, 'opts.defaults');
	assert.object(opts.log, 'opts.log');
	assert.func(cb, 'cb');

	var reasons = {};

	if (servers.length < 2) {
		reasons.skip = 'One or fewer servers';
		return (cb(null, servers, reasons));
	}

	var buckets = [];
	var bucket = [];
	var sortable = [];
	var maxReboot = new Date(0).toISOString();

	// some server have no next_reboot yet, or have a next_reboot
	// older than their last boot; we treat these the same.
	servers.forEach(function (server) {
		var nextReboot = server.next_reboot;

		if (!nextReboot || nextReboot < server.last_boot) {
			bucket.push(server);
			return;
		}

		if (maxReboot < nextReboot)
			maxReboot = nextReboot;

		sortable.push(server);
	});

	// deal with servers that (effectively) have no next_reboot
	if (bucket.length > 0) {
		buckets.push(bucket);
		bucket = [];
	}

	// deal with the servers that have a next_reboot
	var sorted = sortable.sort(function (a, b) {
		return (a.next_reboot > b.next_reboot);
	}).reverse();

	var limit = new Date(new Date(maxReboot) - WEEK).toISOString();

	sorted.forEach(function (server) {
		if (server.next_reboot > limit) {
			bucket.push(server);
		} else {
			buckets.push(bucket);
			bucket = [server];

			var dateLimit = new Date(server.next_reboot) - WEEK;
			limit = new Date(dateLimit).toISOString();
		}
	});

	if (bucket.length > 0)
		buckets.push(bucket);

	var weight = +opts.defaults.weight_next_reboot;
	if (weight < 0)
		buckets.reverse();

	// add scores to servers
	score(opts.log, buckets, Math.abs(weight), reasons);

	// return unsorted servers (but with mutated scores)
	return (cb(null, servers, reasons));
}


module.exports = {
	name: 'Score servers that will not be rebooted soon more highly',
	run: scoreNextReboot
};
