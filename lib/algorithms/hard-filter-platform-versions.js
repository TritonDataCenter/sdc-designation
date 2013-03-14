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



function filterPlatformVersions(log, state, servers, vmDetails, imgDetails) {
    if (!imgDetails.requirements)
        return servers;

    var minPlatforms = imgDetails.requirements.min_platform;
    var maxPlatforms = imgDetails.requirements.max_platform;

    if (minPlatforms)
        servers = filterMinPlatforms(minPlatforms, servers);

    if (maxPlatforms)
        servers = filterMaxPlatforms(maxPlatforms, servers);

    return servers;
}



function filterMinPlatforms(minPlatforms, servers) {
    var sortedVersions = Object.keys(minPlatforms).sort();
    var maxVersion = sortedVersions.pop();
    var minVersion = sortedVersions.shift();

    if (!maxVersion)
        return servers;

    var acceptableServers = [];

    for (var i = 0; i !== servers.length; i++) {
        var server      = servers[i];
        var version     = server.sysinfo['SDC Version'];
        var platform    = server.sysinfo['Live Image'];
        var minPlatform = minPlatforms[version];

        if (version > maxVersion || platform >= minPlatform ||
            (!minPlatform && minVersion < version && version < maxVersion))
            acceptableServers.push(server);
    }

    return acceptableServers;
}



function filterMaxPlatforms(maxPlatforms, servers) {
    var sortedVersions = Object.keys(maxPlatforms).sort();
    var minVersion = sortedVersions.shift();
    var maxVersion = sortedVersions.pop();

    if (!minVersion)
        return servers;

    var acceptableServers = [];

    for (var i = 0; i !== servers.length; i++) {
        var server      = servers[i];
        var version     = server.sysinfo['SDC Version'];
        var platform    = server.sysinfo['Live Image'];
        var maxPlatform = maxPlatforms[version];

        if (version < minVersion || platform <= maxPlatform ||
            (!maxPlatform && minVersion < version && version < maxVersion))
            acceptableServers.push(server);
    }

    return acceptableServers;

}



module.exports = {
    name: 'Servers which meet image manifest platform requirements',
    run: filterPlatformVersions
};
