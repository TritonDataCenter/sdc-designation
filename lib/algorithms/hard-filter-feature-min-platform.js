/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/*
 * Returns servers which meet any given platform version requirements in an
 * image manifest. By and large, if a server has a platform or version that is
 * newer than that specified in an image manifest's optional min_platform, it
 * passes. The converse happens with max_plaform.
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

	return (cb(null, servers, reasons));
}

module.exports = {
	name: 'Servers which meet various features\' platform requirements',
	run: filterFeatureMinPlatform
};
