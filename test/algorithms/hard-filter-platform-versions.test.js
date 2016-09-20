/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-platform-versions.js');
var common = require('./common.js');


var LOG = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


var SERVERS = genServers([
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


var checkFilter = common.createPluginChecker(filter, LOG);


test('filterPlatformVersions() no platform versions', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {};

	var constraints = { vm: {}, img: {}, pkg: {}, defaults: {} };

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() min platform requirements for images',
		function (t) {
	var expectServers = SERVERS.slice(5, 9);
	expectServers.unshift(SERVERS[3]);

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'b6d9d432-16bd-41b5-b3ac-7e3986380c37': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"6.5":"20121218T203452Z"}',
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"6.5":"20130129T122401Z"}',
		'9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"7.0":"20121210T203034Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				min_platform: {'7.0': '20121211T203034Z'}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() min platform requirements for packages',
		function (t) {
	var expectServers = SERVERS.slice(5, 9);
	expectServers.unshift(SERVERS[3]);

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'b6d9d432-16bd-41b5-b3ac-7e3986380c37': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"6.5":"20121218T203452Z"}',
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"6.5":"20130129T122401Z"}',
		'9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires min platforms {"7.0":"20121211T203034Z"}, but server has {"7.0":"20121210T203034Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {},
		pkg: { min_platform: {'7.0': '20121211T203034Z'} },
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() max platform requirements', function (t) {
	var expectServers = SERVERS.slice(0, 3);
	expectServers.push(SERVERS[4]);

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'c15641a8-1dad-4b96-be1e-6aa694395aee': 'Image or package requires max platforms {"7.0":"20121211T203034Z"}, but server has {"7.0":"20121218T203452Z"}',
		'c98b17b0-d4f9-4a93-b4da-85ee6a065f8a': 'Image or package requires max platforms {"7.0":"20121211T203034Z"}, but server has {"7.0":"20130129T122401Z"}',
		'9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platforms {"7.0":"20121211T203034Z"}, but server has {"7.1":"20121218T203452Z"}',
		'f1a33640-8657-4572-8061-31e1ecebbade': 'Image or package requires max platforms {"7.0":"20121211T203034Z"}, but server has {"7.1":"20121210T203034Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"7.0":"20121211T203034Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				max_platform: {'7.0': '20121211T203034Z'}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() minmax platform requirements 1', function (t) {
	var expectServers = SERVERS.slice(0, 1);

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"6.5":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"6.5":"20130129T122401Z"}',
		'c15641a8-1dad-4b96-be1e-6aa694395aee': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"7.0":"20121218T203452Z"}',
		'9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"7.0":"20121210T203034Z"}',
		'c98b17b0-d4f9-4a93-b4da-85ee6a065f8a': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"7.0":"20130129T122401Z"}',
		'9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"7.1":"20121218T203452Z"}',
		'f1a33640-8657-4572-8061-31e1ecebbade': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"7.1":"20121210T203034Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"6.5":"20130128T203034Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				min_platform: {'6.5': '20121211T203034Z'},
				max_platform: {'6.5': '20130128T203034Z'}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() minmax platform requirements 2', function (t) {
	var expectServers = SERVERS.slice(2, 6);
	expectServers.unshift(SERVERS[0]);
	expectServers[expectServers.length] = SERVERS[7];

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"6.5":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platforms {"7.1":"20121217T203452Z"}, but server has {"7.1":"20121218T203452Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"7.1":"20121217T203452Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				min_platform: {'6.5': '20121211T203034Z'},
				max_platform: {'7.1': '20121217T203452Z'}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() minmax platform requirements 3', function (t) {
	var expectServers = SERVERS.slice(3, 6);
	expectServers.unshift(SERVERS[0]);
	expectServers[expectServers.length] = SERVERS[7];

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"6.5":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires max platforms {"6.5":"20130101T122401Z","7.1":"20121217T203452Z"}, but server has {"6.5":"20130129T122401Z"}',
		'9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platforms {"6.5":"20130101T122401Z","7.1":"20121217T203452Z"}, but server has {"7.1":"20121218T203452Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"6.5":"20130101T122401Z","7.1":"20121217T203452Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				min_platform: {'6.5': '20121211T203034Z'},
				max_platform: {
					'6.5': '20130101T122401Z',
					'7.1': '20121217T203452Z'
				}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() minmax platform requirements 4', function (t) {
	var expectServers = SERVERS.slice(2, 7);
	expectServers.unshift(SERVERS[0]);

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"6.5":"20121211T203034Z","7.1":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'f1a33640-8657-4572-8061-31e1ecebbade': 'Image or package requires min platforms {"6.5":"20121211T203034Z","7.1":"20121211T203034Z"}, but server has {"7.1":"20121210T203034Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"7.1":"20121219T203452Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				min_platform: {
					'6.5': '20121211T203034Z',
					'7.1': '20121211T203034Z'
				},
				max_platform: {'7.1': '20121219T203452Z'}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() minmax platform requirements 5', function (t) {
	var expectServers = SERVERS.slice(2, 6);
	expectServers.unshift(SERVERS[0]);
	expectServers[expectServers.length] = SERVERS[7];

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"6.5":"20121218T203452Z"}, but server has {"6.5":"20121210T203034Z"}',
		'9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platforms {"7.1":"20121217T203452Z"}, but server has {"7.1":"20121218T203452Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"7.1":"20121217T203452Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm: {},
		img: {
			requirements: {
				min_platform: {'6.5': '20121218T203452Z'},
				max_platform: {'7.1': '20121217T203452Z'}
			}
		},
		pkg: { min_platform: {'6.5': '20121210T203034Z'} },
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() ignore non-versions', function (t) {
	var expectServers = SERVERS.slice(2, 6);
	expectServers.unshift(SERVERS[0]);
	expectServers[expectServers.length] = SERVERS[7];

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"6.5":"20121211T203034Z"}, but server has {"6.5":"20121210T203034Z"}',
		'9902bee1-fe4a-4f77-93db-951ed5c501bb': 'Image or package requires max platforms {"7.1":"20121217T203452Z"}, but server has {"7.1":"20121218T203452Z"}',
		'26dbdcdc-ed50-4169-b27f-e12f27c20026': 'Image or package requires max platforms {"7.1":"20121217T203452Z"}, but server has {"7.1":"20130129T122401Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm:  {},
		img: {
			requirements: {
				min_platform: {
					'6.5': '20121211T203034Z',
					'smartos': '20121217T203452Z'
				},
				max_platform: {
					'7.1': '20121217T203452Z',
					'smartos': '20121211T203034Z'
				}
			}
		},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() with filter_docker_min_platform, no Docker',
function (t) {
	var expectServers = SERVERS;
	var expectReasons = {};

	var constraints = {
		vm: {},
		img: {},
		pkg: {},
		defaults: {
			filter_docker_min_platform: '20121218T203452Z'
		}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() with filter_docker_min_platform, VM is Docker',
function (t) {
	var expectServers = [
		SERVERS[3],
		SERVERS[5],
		SERVERS[6],
		SERVERS[7],
		SERVERS[8]
	];

	var expectReasons = {
		/* BEGIN JSSTYLED */
		'5d4de22f-e082-43ae-83ec-9957be55f2e1': 'Image or package requires min platforms {"7.0":"20121218T203452Z"}, but server has {"6.5":"20130129T122401Z"}',
		'9728b8c3-ecbd-4af9-94b0-a1b26e6e5cc0': 'Image or package requires min platforms {"7.0":"20121218T203452Z"}, but server has {"7.0":"20121210T203034Z"}',
		'aa652df0-7954-4cbb-9243-3cbb2c99b7be': 'Image or package requires min platforms {"7.0":"20121218T203452Z"}, but server has {"6.5":"20121210T203034Z"}',
		'b6d9d432-16bd-41b5-b3ac-7e3986380c37': 'Image or package requires min platforms {"7.0":"20121218T203452Z"}, but server has {"6.5":"20121218T203452Z"}'
		/* END JSSTYLED */
	};

	var constraints = {
		vm: {
			docker: true
		},
		img: {},
		pkg: {},
		defaults: {
			filter_docker_min_platform: '20121218T203452Z'
		}
	};

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() no pkg', function (t) {
	var expectServers = SERVERS;
	var expectReasons = {};

	var constraints = { vm: {}, img: {}, defaults: {} };

	checkFilter(t, SERVERS, constraints, expectServers, expectReasons);
});


test('filterPlatformVersions() with no servers', function (t) {
	var expectServers = [];
	var expectReasons = {};

	var constraints = { vm: {}, img: {}, pkg: {}, defaults: {} };

	checkFilter(t, [], constraints, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
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
