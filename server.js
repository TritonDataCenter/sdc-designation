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

var interceptors = require('./lib/interceptors');
var allocation = require('./lib/allocation');

var UFDS = require('./lib/ufds');

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
  name: 'dapi',
  level: config.logLevel,
  serializers: {
    err: Logger.stdSerializers.err,
    req: Logger.stdSerializers.req,
    res: restify.bunyan.serializers.response
  }
});



/*
 * DAPI constructor
 */
function DAPI(options) {
  this.config = options;

  this.server = restify.createServer({
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

  this.server.on('uncaughtException', function (req, res, route, error) {
    req.log.info({
      err: error,
      url: req.url,
      params: req.params
    });

    res.send(new restify.InternalError('Internal Server Error'));
  });
}



/*
 * Sets custom middlewares to use for the API
 */
DAPI.prototype.setMiddleware = function () {
  this.server.use(restify.acceptParser(this.server.acceptable));
  this.server.use(restify.authorizationParser());
  this.server.use(restify.bodyParser());
  this.server.use(restify.queryParser());
}



/*
 * Sets all routes for static content
 */
DAPI.prototype.setStaticRoutes = function () {

  // TODO: static serve the docs, favicon, etc.
  //  waiting on https://github.com/mcavage/node-restify/issues/56 for this.
  this.server.get('/favicon.ico', function (req, res, next) {
      filed(__dirname + '/docs/media/img/favicon.ico').pipe(res);
      next();
  });
}



/*
 * Sets all routes for the ZAPI server
 */
DAPI.prototype.setRoutes = function () {

  var before = [
    addProxies,
    interceptors.authenticate
  ];

  allocation.mount(this.server, before);
}



/*
 * Starts listening on the port given specified by config.api.port. Takes a
 * callback as an argument. The callback is called with no arguments
 */
DAPI.prototype.listen = function (callback) {
  this.server.listen(this.config.api.port, '0.0.0.0', callback);
}



/*
 * Loads UFDS into the request chain
 */
function addProxies(req, res, next) {
  req.config = config;
  req.ufds = ufds;

  return next();
}


var ufds;
var dapi = new DAPI(config);

try {
  config.ufds.logLevel = config.logLevel;
  ufds = new UFDS(config.ufds);
} catch (e) {
  console.error('Invalid UFDS config: ' + e.message);
  process.exit(1);
}



ufds.on('ready', function () {
  dapi.setMiddleware();
  dapi.setStaticRoutes();
  dapi.setRoutes();

  dapi.listen(function () {
    log.info({url: dapi.server.url}, '%s listening', dapi.server.name);
  });
});

ufds.on('error', function (err) {
  log.error(err, 'error connecting to UFDS. Aborting.');
  process.exit(1);
});
