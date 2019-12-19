/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2019 Joyent, Inc.
 */

/*
 * Filters servers with 'Zpool Encryption' set to 'true'
 * from server selection.
 */

var assert = require('assert-plus');

function filterZpoolEncryption(servers, opts, cb) {
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.object(opts.log, 'opts.log');
	assert.func(cb, 'cb');

	var log = opts.log;
	var vm = opts.vm;

	var reasons = {};
	var encrypt = vm.internal_metadata && vm.internal_metadata.encrypted;

	log.trace('Filtering Zpool Encrypted');

	var adequateServers = servers.filter(function (server) {
		var zpoolEncrypted = false;
		var sysinfo = server.sysinfo;

		if (sysinfo.hasOwnProperty('Zpool Encrypted')) {
			zpoolEncrypted = Boolean(sysinfo['Zpool Encrypted']);
		}

		if (!zpoolEncrypted && encrypt) {
			reasons[server.uuid] = 'Server is not Zpool Encrypted';
		}

		if (zpoolEncrypted && !encrypt) {
			reasons[server.uuid] = 'Server is Zpool Encrypted';
		}

		return encrypt ? zpoolEncrypted : !zpoolEncrypted;
	});

	cb(null, adequateServers, reasons);
}

module.exports = {
	name: 'Servers which are zpool encrypted',
	run: filterZpoolEncryption
};
