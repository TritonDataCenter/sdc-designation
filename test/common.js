/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2019, Joyent, Inc.
 */

var fs = require('fs');


var ALGO_DESC = [
	'pipe', 'hard-filter-setup',
		'hard-filter-running',
		// servers above invalid-servers could contain gibberish
		'hard-filter-invalid-servers',
		// keep volumes-from early; if present, it cuts down number
		// of servers to just one:
		'hard-filter-volumes-from',
		'hard-filter-reserved',
		'hard-filter-vlans',
		'hard-filter-platform-versions',
		'hard-filter-traits',
		'hard-filter-headnode',
		'hard-filter-overprovision-ratios',
		// above plugins do not need vm info
		// we defer vm loading as late as possible:
		'load-server-vms',
		'calculate-ticketed-vms',
		'hard-filter-capness',
		'hard-filter-vm-count',
		'calculate-server-unreserved',
		'hard-filter-min-ram',
		'hard-filter-min-cpu',
		'hard-filter-min-disk',
		'calculate-affinity',
		'hard-filter-locality-hints',
		'hard-filter-owners-servers',
		['or', 'hard-filter-reservoir',
		        'identity'],
		['or', 'hard-filter-large-servers',
		        'identity' ],
		'soft-filter-locality-hints',
		'score-unreserved-ram',
		'score-unreserved-disk',
		'score-num-owner-zones',
		'score-current-platform',
		'score-next-reboot',
		'score-uniform-random'
];


var DEFAULTS = {
	weight_current_platform: 1,
	weight_next_reboot: 0.5,
	weight_num_owner_zones: 0,
	weight_uniform_random: 0.5,
	weight_unreserved_disk: 1,
	weight_unreserved_ram: 2,
	filter_headnode: true,
	filter_min_resources: true,
	filter_large_servers: true
};


var servers;
function getExampleServers() {
	if (!servers)
		servers = fs.readFileSync(__dirname + '/common.json');

	// parsing now as a form of deep copy, so multiple tests can't conflict
	return (JSON.parse(servers).exampleServers);
}


module.exports = {
	ALGO_DESC: ALGO_DESC,
	DEFAULTS: DEFAULTS,
	getExampleServers: getExampleServers
};
