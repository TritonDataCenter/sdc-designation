/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var assert = require('assert-plus');


function clone(obj) {
	return (JSON.parse(JSON.stringify(obj)));
}


function createPluginChecker(plugin, log) {
	assert.object(plugin);
	assert.object(log);

	return function checkPlugin(t, givenServers, constraints, expectServers,
			expectReasons) {
		assert.object(t);
		assert.object(constraints);
		assert.object(expectReasons);
		assert.arrayOfObject(givenServers);
		assert.arrayOfObject(expectServers);

		plugin.run(log, clone(givenServers), constraints,
				function (err, servers, reasons) {
			assert.arrayOfObject(servers);
			assert.object(reasons);

			t.ifError(err);

			t.deepEqual(servers, expectServers);
			t.deepEqual(reasons, expectReasons);

			t.end();
		});
	};
}


module.exports = {
	createPluginChecker: createPluginChecker,
	clone: clone
};
