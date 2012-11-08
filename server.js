/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Starts up a process which answers HTTP requests for server allocations.
 */



var fs   = require('fs');
var HTTP = require('./lib/http-interface');

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

    var http = new HTTP(config);
    http.listen();
}



main();
