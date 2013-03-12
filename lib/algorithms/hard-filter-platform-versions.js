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
        var minPlatform = minPlatforms[PLATFORM_VERSION];

    if (maxPlatforms)
        var maxPlatform = maxPlatforms[PLATFORM_VERSION];

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



module.exports = {
    name: 'Servers which meet image manifest platform requirements',
    run: filterPlatformVersions
};
