/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var test = require('tape');

var common = require('./common.js');
var filter =
	require('../../lib/algorithms/hard-filter-feature-min-platform.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var testServers = genServers([
	['b6d9d432-16bd-41b5-b3ac-7e3986380c37', '6.5', '20121218T203452Z'],
	['aa652df0-7954-4cbb-9243-3cbb2c99b7be', '6.5', '20121210T203034Z'],
	/* null should default to 6.5 */
	['5d4de22f-e082-43ae-83ec-9957be55f2e1', null,  '20130129T122401Z'],
	['c15641a8-1dad-4b96-be1e-6aa694395aee', '7.0', '20121218T203452Z'],
	['9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0', '7.0', '20121210T203034Z'],
	['c98b17b0-d4f9-4a93-b4da-85ee6a065f8a', '7.0', '20130129T122401Z'],
	['9902bee1-fe4a-4f77-93db-951ed5c501bb', '7.1', '20121218T203452Z'],
	['f1a33640-8657-4572-8061-31e1ecebbade', '7.1', '20121210T203034Z'],
	['26dbdcdc-ed50-4169-b27f-e12f27c20026', '7.1', '20130129T122401Z']
]);

var checkFilter = common.createPluginChecker(filter);

test('filterFeatureMinPlatform with filter_docker_min_platform, no Docker',
function (t) {
	var expectedServers = testServers;

	var opts = {
		vm: {},
		img: {},
		pkg: {},
		defaults: {
			filter_docker_min_platform: '20121218T203452Z',
			filter_docker_nfs_volumes_automount_min_platform:
				'20160613T123039Z'
		}
	};

	var expectedReasons = {};


	checkFilter(t, testServers, opts, expectedServers, expectedReasons);
});


test('filterFeatureMinPlatform with filter_docker_min_platform, VM is Docker',
function (t) {
	var expectedServers = [
		testServers[3],
		testServers[5],
		testServers[6],
		testServers[7],
		testServers[8]
	];

	var opts = {
		vm: {
			docker: true
		},
		img: {},
		pkg: {},
		defaults: {
			filter_docker_min_platform: '20121218T203452Z',
			filter_docker_nfs_volumes_automount_min_platform:
				'20160613T123039Z'
		}
	};

	var expectedReasons = {
		/* BEGIN JSSTYLED */
		'5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Docker support requires min platforms {"7.0":"20121218T203452Z"}, but server has {"6.5":"20130129T122401Z"}',
		'9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Docker support requires min platforms {"7.0":"20121218T203452Z"}, but server has {"7.0":"20121210T203034Z"}',
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Docker support requires min platforms {"7.0":"20121218T203452Z"}, but server has {"6.5":"20121210T203034Z"}',
		'b6d9d432-16bd-41b5-b3ac-7e3986380c37': 'Docker support requires min platforms {"7.0":"20121218T203452Z"}, but server has {"6.5":"20121218T203452Z"}'
		/* END JSSTYLED */
	};

	checkFilter(t, testServers, opts, expectedServers, expectedReasons);
});


function
genServers(serverData)
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
