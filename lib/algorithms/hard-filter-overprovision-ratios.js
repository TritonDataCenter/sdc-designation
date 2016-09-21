/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Returns servers which have the same overprovisioning ratios as the requested
 * VM. Typically we want VMs with the same overprovision ratios to go on the
 * same servers. Mixing VMs with different overprovision ratios causes some
 * problems:
 *
 * - If an VM with a high ratio (e.g. 2.0) in some resource is allocated onto a
 *   server with a low ratio (e.g. 1.0), the 1.0 guarantee cannot be held for
 *   other 1.0 VMs on that server.
 *
 * - If an VM with a low ratio (e.g. 1.0) in some ratio is allocated onto a
 *   server with a high ratio (e.g. 2.0), the 1.0 guarantee cannot be held for
 *   that VM due to the 2.0 VMs on that server.
 */

var assert = require('assert-plus');

var OP_KEY_MATCH = [['cpu',  'overprovision_cpu' ],
					['ram',  'overprovision_ram' ],
					['disk', 'overprovision_disk'],
					['io',   'overprovision_io'  ],
					['net',  'overprovision_net' ]];

function
filterOverprovisionRatios(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.func(cb, 'cb');

	var pkg = opts.pkg;
	var reasons = {};

	if (!pkg) {
		reasons.skip = 'No pkg provided';
		return (cb(null, servers, reasons));
	}

	OP_KEY_MATCH.forEach(function (pair) {
		var serverKey = pair[0];
		var pkgKey = pair[1];
		var pkgRatio = canonicalize(pkg[pkgKey]);

		servers = servers.filter(function (server) {
			var serverRatio = canonicalize(
			    server.overprovision_ratios[serverKey]);

			if (serverRatio === pkgRatio)
				return (true);

			reasons[server.uuid] = 'Package over-provision ratio ' +
				'of ' + pkgRatio + ' does not match ' +
				'server\'s ' + serverRatio;

			return (false);
		});
	});

	return (cb(null, servers, reasons));
}

/*
 * In order to avoid problems with floating-point comparisons.
 */
function
canonicalize(num)
{
	if (!num)
		return (null);

	return (num.toFixed(2));
}

module.exports = {
	name: 'Servers with same overprovision ratios as requested VM',
	run: filterOverprovisionRatios
};
