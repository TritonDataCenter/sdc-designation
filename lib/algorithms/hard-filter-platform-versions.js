/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
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

var platformVersions = require('./shared/platform-versions.js');

var VERSION_RE = /^\d+\.\d+$/;

function
filterPlatformVersions(servers, opts, cb)
{
	assert.arrayOfObject(servers, 'servers');
	assert.object(opts, 'opts');
	assert.object(opts.vm, 'opts.vm');
	assert.object(opts.img, 'opts.img');
	assert.object(opts.defaults, 'opts.defaults');
	assert.func(cb, 'cb');

	var reasons = {};

	var pkgMinPlatforms = opts.pkg && opts.pkg.min_platform;
	if (pkgMinPlatforms)
		servers = platformVersions.filterMinPlatforms(pkgMinPlatforms,
			servers, 'Package', reasons);

	var img = opts.img;
	if (!img.requirements)
		return (cb(null, servers, reasons));

	var imgMinPlatforms = img.requirements.min_platform;
	if (imgMinPlatforms)
		servers = platformVersions.filterMinPlatforms(imgMinPlatforms,
			servers, 'Image', reasons);

	var imgMaxPlatforms = img.requirements.max_platform;
	if (imgMaxPlatforms)
		servers = platformVersions.filterMaxPlatforms(imgMaxPlatforms,
			servers, 'Image', reasons);

	return (cb(null, servers, reasons));
}


module.exports = {
	name:'Servers which meet image manifest and package platform ' +
		'requirements',
	run: filterPlatformVersions
};
