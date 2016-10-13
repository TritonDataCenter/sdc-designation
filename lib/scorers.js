/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var assert = require('assert-plus');


/*
 * A linear scoring function, which increments the score of servers
 * (inverse)linearly, based on order of server array. Servers at the
 * beginning of the array get higher scores than those later on.
 */

function
linear(log, servers, weight, reasons)
{
	var msg;

	if (servers.length === 0)
		return (servers);

	reasons = reasons || {};

	if (servers.length === 1) {
		servers[0].score += weight;

		var uuid = servers[0].uuid;
		msg = 'increased score by ' + weight.toFixed(2) +
			' to ' + servers[0].score.toFixed(2);
		reasons[uuid] = msg;
		log.trace('Server ', uuid, msg);

		return (servers);
	}

	var normDelta = 1 / (servers.length - 1);

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		assert.number(server.score);

		var score = (servers.length - 1 - i) * normDelta * weight;
		server.score += score;

		msg = 'increased score by ' + score.toFixed(2) +
			' to ' + server.score.toFixed(2);
		reasons[server.uuid] = msg;
		log.trace('Server', server.uuid, msg);
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
			assert.number(server.score);
			server.score += score;

			var msg = 'increased score by ' + score.toFixed(2) +
				' to ' + server.score.toFixed(2);
			reasons[server.uuid] = msg;
			log.trace('Server', server.uuid, msg);
		});
	}

	// flatten buckets into array of servers
	var servers = [].concat.apply([], buckets);

	return (servers);
}


/*
 * A scoring function that normalizes raw numbers associated with each
 * server into the range [0, 1], then multiplies by the weight to produce
 * the final score delta.
 *
 * The unnormalizedServers arg is an array of tuples, where the first value
 * of each tuple is a server, and the second value is the raw score to normalize
 * for that server and alter the server's score.
 */

function
normalize(log, unnormalizedServers, weight, reasons)
{
	if (unnormalizedServers.length === 0)
		return ([]);

	reasons = reasons || {};

	var unnormalized = unnormalizedServers.map(function (tuple) {
		return (tuple[1]);
	});

	var min = Math.min.apply(null, unnormalized);
	var max = Math.max.apply(null, unnormalized);
	var scale = 1/(max - min) * Math.abs(weight);

	function nop() {
		return (weight);
	}

	function norm(raw) {
		var interVal = (weight > 0) ? (raw - min) : (max - raw);
		return (interVal * scale);
	}

	var calcWeight = (min === max) ? nop : norm;

	var servers = unnormalizedServers.map(function (tuple) {
		assert.array(tuple);

		var server   = tuple[0];
		var rawScore = tuple[1];
		assert.object(server);
		assert.number(server.score);
		assert.number(rawScore);

		var delta = calcWeight(rawScore);
		server.score += delta;

		var msg = 'increased score by ' + delta.toFixed(2) +
			' to ' + server.score.toFixed(2);
		reasons[server.uuid] = msg;
		log.trace('Server ', server.uuid, msg);

		return (server);
	});

	return (servers);
}



module.exports = {
	linear: linear,
	linearBuckets: linearBuckets,
	normalize: normalize
};
