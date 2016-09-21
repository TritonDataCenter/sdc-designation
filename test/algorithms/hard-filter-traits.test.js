/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-traits.js');
var common = require('./common.js');


var SERVERS = [ {
	uuid: 'de52bbab-a12d-4e11-8292-c4141031553c',
	traits: { ssd: true,  users: 'john' }
}, {
	uuid: '56b19a96-bd79-4b0d-bf31-6287500e653c',
	traits: { ssd: true,  users: ['john', 'jane'] }
}, {
	uuid: '11a7ea8e-a9ee-4101-852d-cd47536b9ff0',
	traits: { ssd: true  }
}, {
	uuid: 'c2edd722-16cd-4b2f-9436-5cde12cf0eb0',
	traits: { ssd: false }
}, {
	uuid: 'f459c92d-1b50-4cea-9412-8d7af4acfc31',
	traits: { users: ['jack', 'jane'] }
}, {
	uuid: '70675b48-a989-466a-9cde-8b65fa2df12e',
	traits: { users: 'john' }
} ];


var checkFilter = common.createPluginChecker(filter);


test('filterTraits() for VMs 1', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { ssd: true } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs 2', function (t) {
	var expectServers = SERVERS.slice(3, 4);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { ssd: false } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});



test('filterTraits() for VMs 3', function (t) {
	var expectServers = SERVERS.slice(5, 6);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'users comparison failed: server trait array did not contain trait'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { users: 'john' } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs 4', function (t) {
	var expectServers = SERVERS.slice(4, 5);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'users comparison failed: strings did not match'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { users: 'jack' } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs 5', function (t) {
	var expectServers = SERVERS.slice(1, 2);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'users comparison failed: strings did not match',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":true}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":false}',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":["jack","jane"]}',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":"john"}'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { ssd: true, users: 'jane' } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});



test('filterTraits() for VMs 6', function (t) {
	var expectServers = [];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'ssd comparison failed: boolean did not match',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'ssd comparison failed: boolean did not match',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":true}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":false}',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":["jack","jane"]}',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":"john"}'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { ssd: false, users: 'jane' } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs 7', function (t) {
	var expectServers = SERVERS.slice(4, 6);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm: { traits: { users: ['john', 'jane' ] } },
		img: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 1', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { ssd: true } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 2', function (t) {
	var expectServers = SERVERS.slice(3, 4);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":false} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { ssd: false } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 3', function (t) {
	var expectServers = SERVERS.slice(5, 6);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"john"} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'users comparison failed: server trait array did not contain trait'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { users: 'john' } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 4', function (t) {
	var expectServers = SERVERS.slice(4, 5);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":"jack"} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'users comparison failed: strings did not match'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { users: 'jack' } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 5', function (t) {
	var expectServers = SERVERS.slice(1, 2);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'users comparison failed: strings did not match',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":true}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"ssd":false}',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":["jack","jane"]}',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"jane"} but server has {"users":"john"}'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { ssd: true, users: 'jane' } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 6', function (t) {
	var expectServers = [];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'ssd comparison failed: boolean did not match',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'ssd comparison failed: boolean did not match',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":true}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"ssd":false}',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":["jack","jane"]}',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":false,"users":"jane"} but server has {"users":"john"}'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { ssd: false, users: 'jane' } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for image manifests 7', function (t) {
	var expectServers = SERVERS.slice(4, 6);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"users":["john","jane"]} but server has {"ssd":true,"users":["john","jane"]}',
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'users comparison failed: undefined property',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'users comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		pkg: {},
		img: { traits: { users: ['john', 'jane'] } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs and manifests 1', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	/* image manifest overrides VM package */
	var opts = {
		vm:  { traits: { ssd: false } },
		img: { traits: { ssd: true } },
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs and manifests 2', function (t) {
	var expectServers = SERVERS.slice(0, 2);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":true}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":false}',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":["jack","jane"]}',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":"john"}'
		/* END JSSTYLED */
	};

	/* should merge values between the two */
	var opts = {
		vm:  { traits: { ssd: true } },
		img: { traits: { users: 'john' } },
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs and manifests 3', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  { traits: { ssd: true } },
		img: {},
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for VMs and manifests 4', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		img: { traits: { ssd: true } },
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for packages and manifests 1', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	/* image manifest overrides package */
	var opts = {
		vm:  {},
		img: { traits: { ssd: true  } },
		pkg: { traits: { ssd: false } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for packages and manifests 2', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	/* VM overrides package */
	var opts = {
		vm:  { traits: { ssd: true  } },
		img: {},
		pkg: { traits: { ssd: false } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for packages and manifests 3', function (t) {
	var expectServers = SERVERS.slice(0, 2);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'11a7ea8e-a9ee-4101-852d-cd47536b9ff0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":true}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"ssd":false}',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":["jack","jane"]}',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'Combined vm/pkg/img traits require {"ssd":true,"users":"john"} but server has {"users":"john"}'
		/* END JSSTYLED */
	};

	/* should merge values between the two */
	var opts = {
		vm:  {},
		img: { traits: { users: 'john' } },
		pkg: { traits: { ssd: true	 } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});



test('filterTraits() for packages and manifests 4', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		img: {},
		pkg: { traits: { ssd: true } }
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() for packages and manifests 5', function (t) {
	var expectServers = SERVERS.slice(2, 3);
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'de52bbab-a12d-4e11-8292-c4141031553c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":"john"}',
		'56b19a96-bd79-4b0d-bf31-6287500e653c': 'Combined vm/pkg/img traits require {"ssd":true} but server has {"ssd":true,"users":["john","jane"]}',
		'c2edd722-16cd-4b2f-9436-5cde12cf0eb0': 'ssd comparison failed: boolean did not match',
		'f459c92d-1b50-4cea-9412-8d7af4acfc31': 'ssd comparison failed: undefined property',
		'70675b48-a989-466a-9cde-8b65fa2df12e': 'ssd comparison failed: undefined property'
		/* END JSSTYLED */
	};

	var opts = {
		vm:  {},
		img: { traits: { ssd: true } },
		pkg: {}
	};

	checkFilter(t, SERVERS, opts, expectServers, expectReasons);
});


test('filterTraits() with no traits on server 1', function (t) {
	var servers = [ {
		uuid: '097e339f-1a49-48b2-bec7-ae92a037c22a',
		requested_ram: 256
	} ];

	var expectServers = servers;
	var expectReasons = {};

	var opts = {
		vm:  { traits: {} },
		img: { traits: {} },
		pkg: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterTraits() with no traits on server 2', function (t) {
	var servers = [ {
		uuid: '097e339f-1a49-48b2-bec7-ae92a037c22a',
		requested_ram: 256
	} ];

	var expectServers = [];
	var expectReasons = {
		'097e339f-1a49-48b2-bec7-ae92a037c22a':
		    'Combined vm/pkg/img traits require {"ssd":false} ' +
		    'but server has undefined'
	};

	var opts = {
		vm:  { traits: { ssd: false } },
		img: { traits: {} },
		pkg: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterTraits() with no traits on VM or manifest 1', function (t) {
	var servers = [
		{
			uuid: '636203ab-ae96-4d5c-aaf1-00f030958bee',
			traits: { ssd: true }
		},
		{ uuid: 'cc0c7133-2bdd-4f49-93ae-f24350e8c4d2', traits: {} },
		{ uuid: 'a8c4fc80-9987-4778-9c04-743393c50398' }
	];

	var expectServers = servers.slice(1, 3);
	var expectReasons = {
		'636203ab-ae96-4d5c-aaf1-00f030958bee':
		    'Combined vm/pkg/img require no traits ' +
		    'but server has {"ssd":true}'
	};

	var opts = {
		vm:  { traits: {} },
		img: { traits: {} },
		pkg: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});



test('filterTraits() with no traits on VM or manifest 2', function (t) {
	var servers = [
		{
			uuid: '636203ab-ae96-4d5c-aaf1-00f030958bee',
			traits: { ssd: true }
		},
		{ uuid: 'cc0c7133-2bdd-4f49-93ae-f24350e8c4d2', traits: {} },
		{ uuid: 'a8c4fc80-9987-4778-9c04-743393c50398' }
	];

	var expectServers = servers.slice(1, 3);
	var expectReasons = {
		'636203ab-ae96-4d5c-aaf1-00f030958bee':
		    'Combined vm/pkg/img require no traits ' +
		    'but server has {"ssd":true}'
	};

	var opts = {
		vm:  {},
		img: {},
		pkg: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterTraits() with no package', function (t) {
	var servers = [
		{
			uuid: '636203ab-ae96-4d5c-aaf1-00f030958bee',
			traits: { ssd: true }
		},
		{ uuid: 'cc0c7133-2bdd-4f49-93ae-f24350e8c4d2', traits: {} },
		{ uuid: 'a8c4fc80-9987-4778-9c04-743393c50398' }
	];

	var expectServers = servers.slice(1, 3);
	var expectReasons = {
		'636203ab-ae96-4d5c-aaf1-00f030958bee':
		    'Combined vm/pkg/img require no traits ' +
		    'but server has {"ssd":true}'
	};

	var opts = {
		vm:  { ram: 512 },
		img: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterTraits() with no servers', function (t) {
	var opts = {
		vm:  { ram: 512 },
		pkg: {},
		img: {}
	};

	checkFilter(t, [], opts, [], {});
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
