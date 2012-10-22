/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Main entry-point for the Designation API.
 */

var fs   = require('fs');
var DAPI = require('./lib/dapi');

var CONFIG_PATH  = __dirname + '/config.json';
var PACKAGE_PATH = __dirname + '/package.json';



/*
 * Returns the current semver version stored in CloudAPI's package.json.
 * This is used to set in the API versioning and in the Server header.
 */
function version() {
    var pkg = fs.readFileSync(PACKAGE_PATH, 'utf8');
    version = JSON.parse(pkg).version;

    return version || '7.0.0';
}



/*
 * Loads and parse the configuration file config.json
 */
function loadConfig() {
    try {
      var configFile = fs.readFileSync(CONFIG_PATH, 'utf-8');
    } catch (e) {
        if (e.code !== 'ENOENT')
            throw (e);

        console.error('Config file not found: %s does not exist. Aborting',
                      CONFIG_PATH);
        process.exit(1);
    }

    var config = JSON.parse(configFile);
    return config;
}



function main() {
    var config = loadConfig();
    config.version = version();

    var dapi = new DAPI(config);
    dapi.init();
    dapi.listen();
}



main();
