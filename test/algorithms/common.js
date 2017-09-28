/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2016, Joyent, Inc.
 */

var assert = require('assert-plus');


var OPTS = {
	log: {
		debug: function () { return (true); },
		error: function (err) { console.log(err); return true; },
		info:  function () { return (true); },
		trace: function () { return (true); },
		warn:  function () { return (true); }
	}
};


function clone(obj) {
	return (JSON.parse(JSON.stringify(obj)));
}


function addCommonOpts(opts) {
	assert.object(opts, 'opts');

	Object.keys(OPTS).forEach(function (key) {
		opts[key] = opts[key] || OPTS[key];
	});

	return (opts);
}


function createPluginChecker(plugin) {
	assert.object(plugin, 'plugin');
	assert.object(plugin, 'plugin');

	return function checkPlugin(t, givenServers, opts, expectServers,
			expectReasons) {
		assert.object(t, 't');
		assert.object(opts, 'opts');
		assert.object(expectReasons, 'expectReasons');
		assert.arrayOfObject(givenServers, 'givenServers');
		assert.arrayOfObject(expectServers, 'expectServers');

		opts = addCommonOpts(opts);

		plugin.run(clone(givenServers), opts,
				function (err, servers, reasons) {
			assert.arrayOfObject(servers, 'servers');
			assert.object(reasons, 'reasons');

			t.ifError(err);

			t.deepEqual(servers, expectServers,
				'valid servers should be equal to expected ' +
					'valid servers');
			t.deepEqual(reasons, expectReasons,
				'rejection reasons should be equal to ' +
					'expected reasons');

			t.end();
		});
	};
}

function genServers(serverData)
{
	var servers = serverData.map(function (data) {
		var r = {
			uuid: data[0],
			sysinfo: {
				'SDC Version': data[1],
				'Live Image': data[2]
			}
		};

		return (r);
	});

	return (servers);
}

module.exports = {
	OPTS: OPTS,
	addCommonOpts: addCommonOpts,
	createPluginChecker: createPluginChecker,
	clone: clone,
	genServers: genServers
};
