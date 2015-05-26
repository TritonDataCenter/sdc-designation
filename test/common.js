/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var fs = require('fs');


var servers;

function getExampleServers() {
	if (!servers)
		servers = fs.readFileSync(__dirname + '/common.json');

	// parsing now as a form of deep copy, so multiple tests can't conflict
	return (JSON.parse(servers).exampleServers);
}


module.exports = {
	getExampleServers: getExampleServers
};
