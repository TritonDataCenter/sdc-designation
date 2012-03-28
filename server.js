/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Main entry-point for the Designation API.
 */

var path = require('path');
var fs = require('fs');

var DAPI = require('./lib/dapi')

var VERSION = false;

/**
 * Returns the current semver version stored in CloudAPI's package.json.
 * This is used to set in the API versioning and in the Server header.
 *
 * @return {String} version.
 */
function version() {
    if (!VERSION) {
        var pkg = fs.readFileSync(__dirname + '/package.json', 'utf8');
        VERSION = JSON.parse(pkg).version;
    }

    return VERSION;
}



/*
 * Loads and parse the configuration file at config.json
 */
function loadConfig() {
  var configPath = path.join(__dirname, 'config.json');

  if (!path.existsSync(configPath)) {
    log.error('Config file not found: ' + configPath +
      ' does not exist. Aborting.');
    process.exit(1);
  }

  var config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config;
}

var config = loadConfig();
config.version = version() || '7.0.0';

var dapi;

try {
  dapi = new DAPI(config)
  dapi.init();

} catch (e) {
  console.error('Invalid UFDS config: ' + e.message);
  process.exit(1);
}



dapi.on('ready', function () {
  dapi.listen();
});

dapi.on('error', function (err) {
  dapi.log.error(err, 'error connecting to UFDS. Aborting.');
  process.exit(1);
});
