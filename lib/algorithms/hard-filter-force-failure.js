/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2018, Joyent, Inc.
 */

/*
 * Allows forcing failure for purposes of testing.
 *
 * In the payload, specify `force_designation_failure: true` in the VM's
 * `internal_metadata` in order to cause this provision to fail at DAPI.
 *
 * This is especially useful for tests where you want to simulate a DAPI failure
 * without having to worry about which specific parameters are allowed or not in
 * your specific environment.
 */

var assert = require('assert-plus');

function
filterForcedFailures(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.func(cb, 'cb');

	var idx;
	var reasons = {};
	var metadata = opts.vm.internal_metadata;

	if (metadata && metadata.force_designation_failure) {
		for (idx = 0; idx < servers.length; idx++) {
			reasons[servers[idx].uuid] =
			    'force_designation_failure set, failing';
		}
		cb(null, [], reasons);
		return;
	}

	cb(null, servers, {});
}

module.exports = {
	name: 'Forced failure',
	run: filterForcedFailures
};
