/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var VERSION_RE = /^\d+\.\d+$/;

function getServerVersion(server) {
	return (server.sysinfo['SDC Version'] || '6.5');
}

function getServerPlatform(server) {
	return (server.sysinfo['Live Image']);
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

/* mutates reasons arg, if provided */
function
filterMinPlatforms(minPlatforms, servers, predicateName, reasons)
{
	var acceptableServers = [];
	var maxVersion;
	var minVersion;
	var sortedVersions;

	minPlatforms = getValidPlatforms(minPlatforms);

	sortedVersions = Object.keys(minPlatforms).sort();
	maxVersion = sortedVersions.pop();
	minVersion = sortedVersions.shift();

	if (!maxVersion) {
		acceptableServers = servers;
	} else {
		for (var i = 0; i !== servers.length; i++) {
			var server = servers[i];
			// 6.5 sysinfo is missing SDC Version
			var version = getServerVersion(server);
			var platform = getServerPlatform(server);
			var minPlatform = minPlatforms[version];

			if (version > maxVersion || platform >= minPlatform ||
				(!minPlatform && minVersion < version &&
				version < maxVersion)) {
				acceptableServers.push(server);
			} else {
				reasons[server.uuid] = predicateName +
					' requires min platforms ' +
					JSON.stringify(minPlatforms) +
					', but server has ' + '{"' + version +
					'":"' + platform + '"}';
			}
		}
	}

	return (acceptableServers);
}

/* mutates reasons arg, if provided */
function
filterMaxPlatforms(maxPlatforms, servers, predicateName, reasons)
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
		} else {
			var msg = predicateName + ' requires max platforms ' +
			    JSON.stringify(maxPlatforms) + ', but server has ' +
			    '{"' + version + '":"' + platform + '"}';
			reasons[server.uuid] = msg;
		}
	}

	return (acceptableServers);
}

module.exports = {
	filterMaxPlatforms: filterMaxPlatforms,
	filterMinPlatforms: filterMinPlatforms
};
