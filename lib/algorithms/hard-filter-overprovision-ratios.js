/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
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



var OP_KEY_MATCH = [['cpu',  'overprovision_cpu' ],
                    ['ram',  'overprovision_ram' ],
                    ['disk', 'overprovision_disk'],
                    ['io',   'overprovision_io'  ],
                    ['net',  'overprovision_net' ]];



function filterOverprovisionRatios(log, state, servers, constraints) {
    var pkg = constraints.pkg;

    OP_KEY_MATCH.forEach(function (pair) {
      var serverKey = pair[0];
      var pkgKey    = pair[1];

      var pkgRatio = canonicalize(pkg[pkgKey]);

      servers = servers.filter(function (server) {
        var serverRatio = canonicalize(server.overprovision_ratios[serverKey]);
        return serverRatio === pkgRatio;
      });
    });

    return servers;
}



module.exports = {
    name: 'Servers with same overprovision ratios as requested VM',
    run: filterOverprovisionRatios
};



/*
 * In order to avoid problems with floating-point comparisons.
 */

function canonicalize(num) {
    if (!num)
        return null;

    return num.toFixed(2);
}