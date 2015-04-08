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

var VERSION_RE = /^\d+\.\d+$/;

function filterPlatformVersions(log, state, servers, constraints) {
	var reasons = constraints.capacity ? null : {};
	var img = constraints.img;
	var pkgMinPlatforms = constraints.pkg && constraints.pkg.min_platform;
	var imgMinPlatforms;
	var imgMaxPlatforms;

	if (pkgMinPlatforms)
		servers = filterMinPlatforms(pkgMinPlatforms, servers, reasons);

	if (!img.requirements)
		return ([servers, reasons]);

	imgMinPlatforms = img.requirements.min_platform;
	if (imgMinPlatforms)
		servers = filterMinPlatforms(imgMinPlatforms, servers, reasons);

	imgMaxPlatforms = img.requirements.max_platform;
	if (imgMaxPlatforms)
		servers = filterMaxPlatforms(imgMaxPlatforms, servers, reasons);

	return ([servers, reasons]);
}

/* mutates reasons arg, if provided */
function
filterMinPlatforms(minPlatforms, servers, reasons)
{
	var sortedVersions;
	var maxVersion;
	var minVersion;
	var acceptableServers;

	minPlatforms = getValidPlatforms(minPlatforms);

	sortedVersions = Object.keys(minPlatforms).sort();
	maxVersion = sortedVersions.pop();
	minVersion = sortedVersions.shift();

	if (!maxVersion)
		return (servers);

	acceptableServers = [];

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		// 6.5 sysinfo is missing SDC Version
		var version = server.sysinfo['SDC Version'] || '6.5';
		var platform = server.sysinfo['Live Image'];
		var minPlatform = minPlatforms[version];

		if (version > maxVersion || platform >= minPlatform ||
		    (!minPlatform && minVersion < version &&
		    version < maxVersion)) {
			acceptableServers.push(server);
		} else if (reasons) {
			var msg = 'Image or package requires min platforms ' +
			    JSON.stringify(minPlatforms) + ', but server has ' +
			    '{"' + version + '":"' + platform + '"}';
			reasons[server.uuid] = msg;
		}
	}

	return (acceptableServers);
}

/* mutates reasons arg, if provided */
function
filterMaxPlatforms(maxPlatforms, servers, reasons)
{
	var sortedVersions;
	var minVersion;
	var maxVersion;
	var acceptableServers;

	maxPlatforms = getValidPlatforms(maxPlatforms);

	sortedVersions = Object.keys(maxPlatforms).sort();
	minVersion = sortedVersions.shift();
	maxVersion = sortedVersions.pop();

	if (!minVersion)
		return (servers);

	acceptableServers = [];

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		// 6.5 sysinfo is missing SDC Version
		var version = server.sysinfo['SDC Version'] || '6.5';
		var platform = server.sysinfo['Live Image'];
		var maxPlatform = maxPlatforms[version];

		if (version < minVersion || platform <= maxPlatform ||
		    (!maxPlatform && minVersion < version &&
		    version < maxVersion)) {
			acceptableServers.push(server);
		} else if (reasons) {
			var msg = 'Image or package requires max platforms ' +
			    JSON.stringify(maxPlatforms) + ', but server has ' +
			    '{"' + version + '":"' + platform + '"}';
			reasons[server.uuid] = msg;
		}
	}

	return (acceptableServers);
}

/*
 * Platforms can also include "smartos", and maybe other things in the future.
 * Whitelist only things that are obviously version numbers. Mutates arg.
 */
function
getValidPlatforms(platforms)
{
	var versions = Object.keys(platforms);

	for (var i = 0; i !== versions.length; i++) {
		var version = versions[i];

		if (!version.match(VERSION_RE))
			delete platforms[version];
	}

	return (platforms);
}

module.exports = {
	name: 'Servers which meet image manifest platform requirements',
	run: filterPlatformVersions,
	affectsCapacity: true
};
