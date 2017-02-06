/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-min-free-disk.js');
var common = require('./common.js');


var MiB = 1024 * 1024;
var GiB = 1024 * MiB;
var TiB = 1024 * GiB;

var checkFilter = common.createPluginChecker(filter);


test('filterMinFreeDisk()', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		disk_pool_size_bytes: 4 * TiB,
		disk_pool_alloc_bytes: 3 * TiB
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		disk_pool_size_bytes: 4 * TiB,
		disk_pool_alloc_bytes: 2 * TiB
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		disk_pool_size_bytes: 8 * TiB,
		disk_pool_alloc_bytes: 7 * TiB
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		disk_pool_size_bytes: 8 * TiB,
		disk_pool_alloc_bytes: 4 * TiB
	} ];

	var expectServers = [servers[1], servers[3]];
	var expectReasons = {
		/* BEGIN JSSTYLED */
		'79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf': 'Server requires 1572864MB free disk, but only has 796918MB',
		'f07f6c2c-8f9c-4b77-89fe-4b777dff5826': 'Server requires 1572864MB free disk, but only has 545260MB'
		/* END JSSTYLED */
	};

	var opts = { defaults: { minimum_free_disk: 1.5 * 1024 * 1024 } };

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() without default', function (t) {
	var servers = [ {
		uuid: '79cc8d8a-1754-46d7-bd2c-ab5fe7f8c7bf',
		disk_pool_size_bytes: 4 * TiB,
		disk_pool_alloc_bytes: 3 * TiB
	}, {
		uuid: '9324d37d-e160-4a9d-a6d8-39a519634398',
		disk_pool_size_bytes: 4 * TiB,
		disk_pool_alloc_bytes: 2 * TiB
	}, {
		uuid: 'f07f6c2c-8f9c-4b77-89fe-4b777dff5826',
		disk_pool_size_bytes: 8 * TiB,
		disk_pool_alloc_bytes: 7 * TiB
	}, {
		uuid: '69003dc2-1122-4851-8a2a-fccb609e4e84',
		disk_pool_size_bytes: 8 * TiB,
		disk_pool_alloc_bytes: 4 * TiB
	} ];

	var expectServers = servers;
	var expectReasons = { skip: 'No minimum free disk set' };
	var opts = { defaults: {} };

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('filterMinDisk() with no servers', function (t) {
	var servers = [];

	var expectServers = [];
	var expectReasons = {};

	var opts = { defaults: { minimum_free_disk: 1.5 * 1024 } };

	checkFilter(t, servers, opts, expectServers, expectReasons);
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
