/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

/*
 * An identity function; returns the same servers it received.
 */

var assert = require('assert-plus');

function
identity(log, servers, constraints, cb)
{
	assert.object(log);
	assert.arrayOfObject(servers);
	assert.object(constraints);
	assert.func(cb);

	return (cb(null, servers, {}));
}

module.exports = {
	name: 'Identity function',
	run: identity
};
