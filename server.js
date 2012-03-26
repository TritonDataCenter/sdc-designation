/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Main entry-point for the Designation API.
 */

var filed = require('filed');
var restify = require('restify');
var uuid = require('node-uuid');
var path = require('path');
var fs = require('fs');
var Logger = require('bunyan');


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

var log = new Logger({
  name: 'zapi',
  level: config.logLevel,
  serializers: {
    err: Logger.stdSerializers.err,
    req: Logger.stdSerializers.req,
    res: restify.bunyan.serializers.response
  }
});


var server = restify.createServer({
  name: 'Designation API',
  log: log,
  version: version() || '7.0.0',
  serverName: 'SmartDataCenter',
  accept: ['text/plain',
           'application/json',
           'text/html',
           'image/png',
           'text/css'],
  contentWriters: {
   'text/plain': function (obj) {
     if (!obj)
       return '';
     if (typeof (obj) === 'string')
       return obj;
     return JSON.stringify(obj, null, 2);
    }
  }
});

server.on('uncaughtException', function (req, res, route, error) {
  req.log.info({
    err: error,
    url: req.url,
    params: req.params
  });

  res.send(new restify.InternalError('Internal Server Error'));
});


server.get({path: '/', name: 'ListEggs'}, function(req, res, next) {
  res.send("Hello");
  return next();
});



// TODO: static serve the docs, favicon, etc.
//  waiting on https://github.com/mcavage/node-restify/issues/56 for this.
server.get("/favicon.ico", function (req, res, next) {
  filed(__dirname + '/docs/media/img/favicon.ico').pipe(res);
  next();
});


server.listen(config.api.port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
