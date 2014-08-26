/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var assert = require('assert');
var common = require('./common');
var Allocator = require('../lib/allocator.js');

var logStub = {
	trace: function () { return true; },
	debug: function () { return true; },
	info:  function () { return true; },
	warn:  function () { return true; },
	error: function (err) { console.log(err); return true; }
};

var packages = [
	{
		uuid: '1ee2a2ab-2138-8542-b563-a67bb03792f7',
		active: true,
		cpu_cap: 250,
		max_lwps: 1000,
		max_physical_memory: 768,
		max_swap: 1536,
		name: 'sdc_768',
		quota: 25600,
		vcpus: 1,
		version: '1.0.0',
		zfs_io_priority: 10,
		overprovision_cpu: 4,
		overprovision_memory: 1,
		overprovision_storage: 1,
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		created_at: '2013-08-13T23:19:23.828Z',
		updated_at: '2013-08-13T23:19:23.828Z',
		default: false
	},
	{
		uuid: '73a1ca34-1e30-48c7-8681-70314a9c67d3',
		active: true,
		cpu_cap: 100,
		max_lwps: 1000,
		max_physical_memory: 128,
		max_swap: 256,
		name: 'sdc_128',
		quota: 25600,
		vcpus: 1,
		version: '1.0.0',
		zfs_io_priority: 10,
		overprovision_cpu: 4,
		overprovision_memory: 1,
		overprovision_storage: 1,
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		created_at: '2013-08-13T23:19:23.992Z',
		updated_at: '2013-08-13T23:19:23.992Z',
		default: true
	},
	{
		uuid: '5dfe2cc2-cea2-0841-8e01-6cafbe5b7dbc',
		active: true,
		cpu_cap: 250,
		max_lwps: 1000,
		max_physical_memory: 768,
		max_swap: 1536,
		name: 'sdc_imgapi',
		quota: 512000,
		vcpus: 1,
		version: '1.0.0',
		zfs_io_priority: 10,
		overprovision_cpu: 4,
		overprovision_memory: 1,
		overprovision_storage: 1,
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		created_at: '2013-08-13T23:19:24.006Z',
		updated_at: '2013-08-13T23:19:24.006Z',
		default: false
	},
	{
		uuid: '8d205d81-3672-4297-b80f-7822eb6c998b',
		active: false,
		cpu_cap: 400,
		max_lwps: 1000,
		max_physical_memory: 2048,
		max_swap: 4096,
		name: 'sdc_2048',
		quota: 25600,
		vcpus: 1,
		version: '1.0.0',
		zfs_io_priority: 20,
		overprovision_cpu: 4,
		overprovision_memory: 1,
		overprovision_storage: 1,
		owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
		created_at: '2013-08-13T23:19:23.862Z',
		updated_at: '2013-08-13T23:19:23.862Z',
		default: false
	}
];

var images = [
	{
		v: '2',
		uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
		owner: '9dce1460-0c4c-4417-ab8b-25ca478c5a78',
		name: 'adminui',
		version: 'master-20130521T200112Z-g2d51b90',
		state: 'active',
		disabled: false,
		public: false,
		published_at: '2013-05-21T20:09:12.001Z',
		type: 'zone-dataset',
		os: 'smartos',
		files: [ {
			sha1: '7de58b14c2196b2c3bb224ac770bfddb9e999123',
			size: 197345408,
			compression: 'gzip'
		} ],
		description: 'SDC AdminUI',
		requirements: {
			networks: [ {
				name: 'net0',
				description: 'admin'
			} ]
		},
		tags: {
			smartdc_service: 'true'
		}
	},
	{
		v: '2',
		uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
		owner: '352971aa-31ba-496c-9ade-a379feaecd52',
		name: 'centos-6',
		version: '2.4.2',
		state: 'active',
		disabled: false,
		public: true,
		published_at: '2013-05-13T19:42:33Z',
		type: 'zvol',
		os: 'linux',
		files: [ {
			sha1: 'c6a9b07d125bb821ed7ca979eca8f3943899aa75',
			size: 178215924,
			compression: 'gzip'
		} ],
		description: 'CentOS 6.4 64-bit image with just essential ' +
		    'packages installed. Ideal for users who are comfortable ' +
		    'with setting up their own environment and tools.',
		urn: 'sdc:sdc:centos-6:2.4.2',
		requirements: {
			networks: [ {
				name: 'net0',
				description: 'public'
			} ],
			ssh_key: true
		},
		nic_driver: 'virtio',
		disk_driver: 'virtio',
		cpu_type: 'qemu64',
		image_size: 16384
	}
];

var expected = [
	{
		package_uuid: '1ee2a2ab-2138-8542-b563-a67bb03792f7',
		package_name: 'sdc_768',
		package_version: '1.0.0',
		image_uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
		image_name: 'adminui',
		image_version: 'master-20130521T200112Z-g2d51b90',
		slots: 104
	},
	{
		package_uuid: '1ee2a2ab-2138-8542-b563-a67bb03792f7',
		package_name: 'sdc_768',
		package_version: '1.0.0',
		image_uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
		image_name: 'centos-6',
		image_version: '2.4.2',
		slots: 59
	},
	{
		package_uuid: '73a1ca34-1e30-48c7-8681-70314a9c67d3',
		package_name: 'sdc_128',
		package_version: '1.0.0',
		image_uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
		image_name: 'adminui',
		image_version: 'master-20130521T200112Z-g2d51b90',
		slots: 133
	},
	{
		package_uuid: '73a1ca34-1e30-48c7-8681-70314a9c67d3',
		package_name: 'sdc_128',
		package_version: '1.0.0',
		image_uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
		image_name: 'centos-6',
		image_version: '2.4.2',
		slots: 64
	},
	{
		package_uuid: '5dfe2cc2-cea2-0841-8e01-6cafbe5b7dbc',
		package_name: 'sdc_imgapi',
		package_version: '1.0.0',
		image_uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
		image_name: 'adminui',
		image_version: 'master-20130521T200112Z-g2d51b90',
		slots: 6
	},
	{
		package_uuid: '5dfe2cc2-cea2-0841-8e01-6cafbe5b7dbc',
		package_name: 'sdc_imgapi',
		package_version: '1.0.0',
		image_uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
		image_name: 'centos-6',
		image_version: '2.4.2',
		slots: 5
	}
];

exports.test_capacity = function (t)
{
	var allocator = new Allocator(logStub);
	var res = allocator.packageCapacity(common.exampleServers,
		images, packages);

	t.deepEqual(res, expected);
	t.done();
};
