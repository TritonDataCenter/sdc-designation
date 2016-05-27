/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var assert = require('assert');


/*
 * A linear scoring function, which increments the score of servers
 * (inverse)linearly, based on order of server array. Servers at the
 * beginning of the array get higher scores than those later on.
 */

function
linear(log, servers, weight, reasons)
{
	if (servers.length === 0)
		return (servers);

	reasons = reasons || {};

	if (servers.length === 1) {
		servers[0].score += weight;

		var uuid = servers[0].uuid;
		reasons[uuid] = 'increased score by ' + weight;
		log.trace('Server %s increased score by %d',
			uuid, weight);

		return (servers);
	}

	var normDelta = 1 / (servers.length - 1);

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		assert.equal(typeof (server.score), 'number');

		var score = (servers.length - 1 - i) * normDelta * weight;
		server.score += score;

		reasons[server.uuid] = 'increased score by ' + score;
		log.trace('Server %s increased score by %d',
			server.uuid, score);
	}

	return (servers);
}


/*
 * A linear scoring function, which increments the score of servers
 * (inverse)linearly, based on order of the bucket in an array. Buckets contain
 * servers.  Servers in buckets at the beginning of the array get higher scores
 * than servers in buckets later on.
 */

function
linearBuckets(log, buckets, weight, reasons)
{
	if (buckets.length === 0)
		return ([]);

	reasons = reasons || {};
	var normDelta = 1 / (buckets.length - 1);

	for (var i = 0; i !== buckets.length; i++) {
		var score = (buckets.length - 1 - i) * normDelta * weight;

		// this covers the cases where buckets has length 1
		if (!isFinite(score))
			score = weight;

		buckets[i].forEach(function (server) {
			assert.equal(typeof (server.score), 'number');
			server.score += score;

			reasons[server.uuid] = 'increased score by ' + score;
			log.trace('Server %s increased score by %d',
				server.uuid, score);
		});
	}

	// flatten buckets into array of servers
	var servers = [].concat.apply([], buckets);

	return (servers);
}


module.exports = {
	linear: linear,
	linearBuckets: linearBuckets
};
