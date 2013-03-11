/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Returns servers which meet any given platform version requirements in an
 * image manifest.
 */



var PLATFORM_VERSION = '7.0';



function filterPlatformVersions(log, state, servers, vmDetails, imgDetails) {
    if (!imgDetails.requirements)
        return servers;

    var minPlatforms = imgDetails.requirements.min_platform;
    var maxPlatforms = imgDetails.requirements.max_platform;

    if (minPlatforms)
        var minPlatform = getPlatform(minPlatforms);

    if (maxPlatforms)
        var maxPlatform = getPlatform(maxPlatforms);

    if (minPlatform) {
        servers = servers.filter(function (server) {
            return server.current_platform >= minPlatform;
        });
    }

    if (maxPlatform) {
        servers = servers.filter(function (server) {
            return server.current_platform <= maxPlatform;
        });
    }

    return servers;
}



function getPlatform(platforms) {
    for (var i = 0; i !== platforms.length; i++) {
        var platform = platforms[i];
        if (platform[0] === PLATFORM_VERSION)
            return platform[1];
    }

    return null;
}



module.exports = {
    name: 'Servers which meet image manifest platform requirements',
    run: filterPlatformVersions
};
