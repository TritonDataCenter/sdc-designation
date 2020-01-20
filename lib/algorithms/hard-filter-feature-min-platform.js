/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2020 Joyent, Inc.
 */

/*
 * Returns servers which meet platform versions requirements depending on what
 * features are required by a given provision. Currently checks for the
 * following features:
 *
 * - "docker" feature, or the ability to provision a Docker container
 *
 * - "docker automatic volume mounting", or the ability to have a Docker
 *   container automatically mount the volumes it depends on
 *
 * - "non-docker automatic volume mounting", or the ability to have an
 *   infrastructure container automatically mount the volumes it depends on
 *
 * - "volapi nfs v2" feature, where volapi nfs version 2 zones require a
 *   min_platform that includes the NGZ (non-global zone) zfs/NFS support.
 *
 * - "flexible disk size" feature, or the ability to have several zvols attached
 *   and/or destroyed on a bhyve container
 *
 * Assumes a setup server, so make sure to run hard-filter-setup first.
 */

var assert = require('assert-plus');

var filterMinPlatforms =
	require('./shared/platform-versions.js').filterMinPlatforms;

var VERSION_RE = /^\d+\.\d+$/;

function filterFeatureMinPlatform(servers, opts, cb) {
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.object(opts.img, 'opts.img');
	assert.object(opts.defaults, 'opts.defaults');
	assert.func(cb, 'cb');

	var minPlatforms;
	var reasons = {};

	var dkrMinPlatform = opts.defaults.filter_docker_min_platform;
	if (opts.vm.docker && dkrMinPlatform) {
		var dkrMinPlatforms = { '7.0': dkrMinPlatform };
		servers = filterMinPlatforms(dkrMinPlatforms,
			servers, 'Docker support', reasons);
	}

	var dkrVolAutomountMinPlatform =
	opts.defaults.filter_docker_nfs_volumes_automount_min_platform;
	if (opts.vm.docker && opts.vm.volumes &&
		dkrVolAutomountMinPlatform) {
		var dkrVolAutomountMinPlatforms =
			{ '7.0': dkrVolAutomountMinPlatform };
		servers =
			filterMinPlatforms(dkrVolAutomountMinPlatforms,
				servers, 'Docker volume automount support',
				reasons);
	}

	var nonDkrVolAutomountMinPlatform =
	opts.defaults.filter_non_docker_nfs_volumes_automount_min_platform;
	if (!opts.vm.docker && opts.vm.volumes &&
		nonDkrVolAutomountMinPlatform) {
		var nonDkrVolAutomountMinPlatforms = {
			'7.0': nonDkrVolAutomountMinPlatform
		};

		servers =
			filterMinPlatforms(nonDkrVolAutomountMinPlatforms,
				servers, 'Non-docker volume automount support',
				reasons);
	}

	var nfsVolumeV2MinPlatform =
		opts.defaults.filter_volapi_nfs_v2_min_platform;
	if (nfsVolumeV2MinPlatform && opts.vm.internal_metadata &&
			opts.vm.internal_metadata['volapi-nfs-version'] === 2) {
		minPlatforms = { '7.0': nfsVolumeV2MinPlatform };
		servers = filterMinPlatforms(minPlatforms, servers,
			'volapi nfs v2 support', reasons);
	}

	var flexibleDiskMinPlatform =
	opts.defaults.filter_flexible_disk_min_platform;
	if (opts.vm.flexible_disk_size && flexibleDiskMinPlatform) {
		var flexibleDiskMinPlatforms =
			{ '7.0': flexibleDiskMinPlatform };
		servers =
			filterMinPlatforms(flexibleDiskMinPlatforms,
				servers, 'Flexible disk size support',
				reasons);
	}

	return (cb(null, servers, reasons));
}

module.exports = {
	name: 'Servers which meet various features\' platform requirements',
	run: filterFeatureMinPlatform
};
