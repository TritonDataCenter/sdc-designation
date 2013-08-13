/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers which meet any given platform version requirements in an
 * image manifest. By and large, if a server has a platform or version that is
 * newer than that specified in an image manifest's optional min_platform, it
 * passes. The converse happens with max_plaform.
 *
 * Assumes a setup server, so make sure to run hard-filter-setup first.
 */



var VERSION_RE = /^\d+\.\d+$/;



function filterPlatformVersions(log, state, servers, vmDetails, imgDetails,
                                pkgDetails) {
    var pkgMinPlatforms = pkgDetails.min_platform;
    if (pkgMinPlatforms)
        servers = filterMinPlatforms(pkgMinPlatforms, servers);

    if (!imgDetails.requirements)
        return servers;

    var imgMinPlatforms = imgDetails.requirements.min_platform;
    var imgMaxPlatforms = imgDetails.requirements.max_platform;

    if (imgMinPlatforms)
        servers = filterMinPlatforms(imgMinPlatforms, servers);

    if (imgMaxPlatforms)
        servers = filterMaxPlatforms(imgMaxPlatforms, servers);

    return servers;
}



function filterMinPlatforms(minPlatforms, servers) {
    minPlatforms = getValidPlatforms(minPlatforms);

    var sortedVersions = Object.keys(minPlatforms).sort();
    var maxVersion = sortedVersions.pop();
    var minVersion = sortedVersions.shift();

    if (!maxVersion)
        return servers;

    var acceptableServers = [];

    for (var i = 0; i !== servers.length; i++) {
        var server      = servers[i];
        // 6.5 sysinfo is missing SDC Version
        var version     = server.sysinfo['SDC Version'] || '6.5';
        var platform    = server.sysinfo['Live Image'];
        var minPlatform = minPlatforms[version];

        if (version > maxVersion || platform >= minPlatform ||
            (!minPlatform && minVersion < version && version < maxVersion))
            acceptableServers.push(server);
    }

    return acceptableServers;
}



function filterMaxPlatforms(maxPlatforms, servers) {
    maxPlatforms = getValidPlatforms(maxPlatforms);

    var sortedVersions = Object.keys(maxPlatforms).sort();
    var minVersion = sortedVersions.shift();
    var maxVersion = sortedVersions.pop();

    if (!minVersion)
        return servers;

    var acceptableServers = [];

    for (var i = 0; i !== servers.length; i++) {
        var server      = servers[i];
        // 6.5 sysinfo is missing SDC Version
        var version     = server.sysinfo['SDC Version'] || '6.5';
        var platform    = server.sysinfo['Live Image'];
        var maxPlatform = maxPlatforms[version];

        if (version < minVersion || platform <= maxPlatform ||
            (!maxPlatform && minVersion < version && version < maxVersion))
            acceptableServers.push(server);
    }

    return acceptableServers;

}



/*
 * Platforms can also include "smartos", and maybe other things in the future.
 * Whitelist only things that are obviously version numbers. Mutates arg.
 */
function getValidPlatforms(platforms) {
    var versions = Object.keys(platforms);

    for (var i = 0; i !== versions.length; i++) {
        var version = versions[i];

        if (!version.match(VERSION_RE))
            delete platforms[version];
    }

    return platforms;
}



module.exports = {
    name: 'Servers which meet image manifest platform requirements',
    run: filterPlatformVersions
};
