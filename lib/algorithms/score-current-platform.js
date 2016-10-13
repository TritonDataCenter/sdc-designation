/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

/*
 * Increase the scores of servers based on how old their platform version is.
 *
 * The range of scores that can be added to servers is determined by
 * weight_current_platform (between 0 and abs(weight)). A positive weight will
 * cause servers with more recent platform versions to receive higher scores.
 * A negative weight_current_platform does the opposite: servers with older
 * platform versions receive higher score increases.
 */

var score = require('../scorers').normalize;
var f = require('util').format;


var PLATFORM_RE = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/;


function
scoreCurrentPlatform(log, servers, constraints)
{
	var reasons = {};

	if (servers.length < 2) {
		reasons.skip = 'One or fewer servers';
		return ([servers, reasons]);
	}

	var tuples = servers.map(function (server) {
		var currentPlatform = intDate(server.current_platform);
		return ([server, currentPlatform]);
	});

	var weight = +constraints.defaults.weight_current_platform;

	// add scores to servers
	score(log, tuples, weight, reasons);

	return ([servers, reasons]);
}


// convert a platform name into ms since epoch
function intDate(platform) {
	var match = platform.match(PLATFORM_RE);
	if (!match)
		return (null);

	var dateStr = f('%s-%s-%sT%s:%s:%sZ', match[1], match[2], match[3],
		match[4], match[5], match[6]);

	return (+new Date(dateStr));
}


module.exports = {
	name: 'Score servers running newer platforms more highly',
	run: scoreCurrentPlatform
};
