/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 * Copyright 2026 Edgecast Cloud LLC.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-min-disk.js');
var common = require('./common.js');


var MiB = 1024 * 1024;
var GiB = 1024 * MiB;
var TiB = 1024 * GiB;

var IMAGE_UUID = 'd8d81aee-20cf-11e5-8503-2bc101a1d577';

var checkFilter = common.createPluginChecker(filter);


test('filterMinDisk() without overprovision ratio', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 2560,
		overprovision_ratios: {}
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 5110,
		overprovision_ratios: {}
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 5120,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 7680,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers.slice(0, 2);
	var expectReasons = {
		'f07f6c2c-8f9c-4b77-89fe-4b777dff5826':
			'Package gave no disk overprovision ratio, but ' +
			'server has ratio 1',
		'69003dc2-1122-4851-8a2a-fccb609e4e84':
			'Package gave no disk overprovision ratio, but ' +
			'server has ratio 1'
	};

	var opts = {
		vm:  { quota: 5 },
		img: {},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() without pkg', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 2560,
		overprovision_ratios: {}
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 5110,
		overprovision_ratios: {}
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 5120,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 7680,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {};

	var opts = {
		vm:  { quota: 5 },
		img: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with override', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 2560,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 5110,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 5120,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 7680,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = {
		skip: 'Do not filter out based on unreserved disk'
	};

	var opts = {
		vm:  { quota: 5 },
		img: {},
		pkg: {},
		defaults: { filter_min_resources: false }
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with overprovision ratios - kvm', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 25600,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 50000,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 51200,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 76800,
		overprovision_ratios: { disk: 1.0 }
	} ];

	// 10 GiB image disk + 29 GiB data disk + 10 GiB root + image + fudge
	var expectServers = servers.slice(3, 4);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 60566 MiB disk is more than ' +
			'server\'s spare 25600 MiB',
		'9324d37d-e160-4a9d-a6d8-39a519634398':
			'VM\'s calculated 60566 MiB disk is more than ' +
			'server\'s spare 50000 MiB',
		'f07f6c2c-8f9c-4b77-89fe-4b777dff5826':
			'VM\'s calculated 60566 MiB disk is more than ' +
			'server\'s spare 51200 MiB'
	};

	var opts = {
		vm:  {
			brand: 'kvm',
			quota: 10, // in GiB, the zone root
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024 // in MiB
			}, {
				size: 29 * 1024 // in MiB
			} ]
		},
		img: {
			type: 'zvol',
			image_size: 10 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: {
			quota: 29 * 1024, // MiB
			overprovision_disk: 1.5
		},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with overprovision ratios - zone', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 25600,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 50000,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 51200,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 76800,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers.slice(1, 4);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 30188 MiB disk is more than ' +
			'server\'s spare 25600 MiB'
	};

	var opts = {
		vm:  { quota: 29 }, // in GiB
		img: {
			image_size: 10 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: {
			quota: 50 * 1024, // MiB, but ignored due to vm quota
			overprovision_disk: 1.5
		},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() without vm quota arg', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 25600,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 50000,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 51200,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 76800,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers.slice(1, 4);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 30188 MiB disk is more than ' +
			'server\'s spare 25600 MiB'
	};

	var opts = {
		vm: {},
		img: {
			image_size: 10 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: {
			quota: 29 * 1024, // MiB
			overprovision_disk: 1.5
		},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with no servers', function (t) {
	var servers = [];

	var expectServers = [];
	var expectReasons = {};

	var opts = {
		vm: { quota: 5 }, // in GiB
		img: {
			image_size: 1 * 1024, // in MiB
			files: [ {
				size: 150 * MiB // in bytes
			} ]
		},
		pkg: { overprovision_disk: 1.0 },
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with no disk', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 2560,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		unreserved_disk: 5110,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		unreserved_disk: 5120,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers;
	var expectReasons = { skip: 'Vm and pkg have no quota' };

	var opts = {
		vm: {},
		img: {},
		pkg: {},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


var HVM_SERVERS = [ {
	uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
	unreserved_disk: 836 * GiB / MiB,
	overprovision_ratios: { disk: 1.0 }
}, {
	uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
	unreserved_disk: 2 * TiB / MiB,
	overprovision_ratios: { disk: 1.0 }
} ];

var HVM_IMG = {
	type: 'zvol',
	image_size: 10 * 1024, // in MiB
	files: [ {
		size: 150 * MiB // in bytes
	} ]
};

function hvmTooBigReasons(requestedDisk) {
	return ({
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated ' + requestedDisk + ' MiB disk is ' +
			'more than server\'s spare 856064 MiB'
	});
}


test('filterMinDisk() with 1.5 TiB flexible disk bhyve', function (t) {
	// VMAPI deletes quota for bhyve and sets flexible_disk_size from
	// pkg.quota. 1.5 TiB flex + 1 GiB root + image + fudge
	var expectServers = HVM_SERVERS.slice(1);
	var expectReasons = hvmTooBigReasons(1584278);

	var opts = {
		vm: {
			brand: 'bhyve',
			flexible_disk_size: 1.5 * TiB / MiB,
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024,
				boot: true
			}, {
				size: 1.5 * TiB / MiB - 10 * 1024
			} ]
		},
		img: HVM_IMG,
		pkg: {
			quota: 1.5 * TiB / MiB,
			flexible_disk: true,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	checkFilter(t, HVM_SERVERS, opts, expectServers, expectReasons);
});


test('filterMinDisk() with kvm sized from pkg', function (t) {
	// No disks given: 50 GiB pkg + 10 GiB image + 10 GiB root + image +
	// fudge
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 80000,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 82070,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers.slice(1);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 82070 MiB disk is more than ' +
			'server\'s spare 80000 MiB'
	};

	var opts = {
		vm: { brand: 'kvm', quota: 10 },
		img: HVM_IMG,
		pkg: {
			quota: 50 * 1024,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with bhyve boot disk larger than image', function (t) {
	// 80 GiB boot + 50 GiB data + 1 GiB root + image + fudge
	var opts = {
		vm: {
			brand: 'bhyve',
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024,
				size: 80 * 1024
			}, {
				size: 50 * 1024
			} ]
		},
		img: HVM_IMG,
		pkg: {
			quota: 50 * 1024,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 144533,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 144534,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers.slice(1);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 144534 MiB disk is more than ' +
			'server\'s spare 144533 MiB'
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with hvm and no pkg or quota', function (t) {
	// image disk without image_size falls back to img.image_size:
	// 10 GiB image + 1000 GiB data + 1 GiB root + image + fudge
	var expectServers = HVM_SERVERS.slice(1);
	var expectReasons = hvmTooBigReasons(1045654);

	var opts = {
		vm: {
			brand: 'bhyve',
			disks: [ {
				image_uuid: IMAGE_UUID
			}, {
				size: 1000 * 1024
			} ]
		},
		img: HVM_IMG,
		defaults: {}
	};

	checkFilter(t, HVM_SERVERS, opts, expectServers, expectReasons);
});


test('filterMinDisk() with bhyve quota 0', function (t) {
	// vmadm clamps the bhyve root to 1 GiB: 10 GiB image + 50 GiB data +
	// 1 GiB root + image + fudge
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		unreserved_disk: 72853,
		overprovision_ratios: { disk: 1.0 }
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		unreserved_disk: 72854,
		overprovision_ratios: { disk: 1.0 }
	} ];

	var expectServers = servers.slice(1);
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s calculated 72854 MiB disk is more than ' +
			'server\'s spare 72853 MiB'
	};

	var opts = {
		vm: {
			brand: 'bhyve',
			quota: 0,
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024
			}, {
				size: 50 * 1024
			} ]
		},
		img: HVM_IMG,
		pkg: {
			quota: 50 * 1024,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with hvm cdrom', function (t) {
	// cdroms have no zvol: 10 GiB image + 1000 GiB data + 1 GiB root +
	// image + fudge
	var expectServers = HVM_SERVERS.slice(1);
	var expectReasons = hvmTooBigReasons(1045654);

	var opts = {
		vm: {
			brand: 'bhyve',
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024
			}, {
				size: 1000 * 1024
			}, {
				media: 'cdrom',
				path: '/install.iso'
			} ]
		},
		img: HVM_IMG,
		pkg: {
			quota: 1000 * 1024,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	checkFilter(t, HVM_SERVERS, opts, expectServers, expectReasons);
});


test('filterMinDisk() with unresolved hvm disk size', function (t) {
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s disk size could not be determined',
		'69003dc2-1122-4851-8a2a-fccb609e4e84':
			'VM\'s disk size could not be determined'
	};

	var opts = {
		vm: {
			brand: 'bhyve',
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024
			}, {
				size: 'remaining'
			} ]
		},
		img: HVM_IMG,
		pkg: {
			quota: 50 * 1024,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	checkFilter(t, HVM_SERVERS, opts, [], expectReasons);
});


test('filterMinDisk() with hvm non-image disk without size', function (t) {
	var expectReasons = {
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf':
			'VM\'s disk size could not be determined',
		'69003dc2-1122-4851-8a2a-fccb609e4e84':
			'VM\'s disk size could not be determined'
	};

	var opts = {
		vm: {
			brand: 'kvm',
			quota: 10,
			disks: [ {
				image_uuid: IMAGE_UUID,
				image_size: 10 * 1024
			}, {
				model: 'virtio'
			} ]
		},
		img: HVM_IMG,
		pkg: {
			quota: 50 * 1024,
			overprovision_disk: 1.0
		},
		defaults: {}
	};

	checkFilter(t, HVM_SERVERS, opts, [], expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
