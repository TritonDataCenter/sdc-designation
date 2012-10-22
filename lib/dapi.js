/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Main entry-point for the Designation API.
 */



var restify = require('restify');
var Logger = require('bunyan');
var util = require('util');
var path = require('path');
var allocation = require('./allocation');

var ALGORITHMS_PATH = './algorithms/';



/*
 * DAPI constructor
 */
function DAPI(options) {
    this.config = options;
    this.algorithms = [];
    this.log = null;
    this.server = null;

    this._init();
}



/*
 * DAPI init code. Will throw exception when config is bad
 */
DAPI.prototype._init =
function () {
    var self = this;

    self.log = new Logger({
        name: 'dapi',
        level: self.config.logLevel,
        serializers: {
            err: Logger.stdSerializers.err,
            req: Logger.stdSerializers.req,
            res: restify.bunyan.serializers.response
        }
    });

    self.server = restify.createServer({
        name: 'Designation API',
        log: self.log,
        version: self.config.version,
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

    self.server.on('uncaughtException', function (req, res, route, error) {
        req.log.info({
            err: error,
            url: req.url,
            params: req.params
        });

        res.send(new restify.InternalError('Internal Server Error'));
    });

    self._setMiddleware();
    self._setRoutes();
    self._loadAlgorithms();
};



/*
 * Sets custom middlewares to use for the API
 */
DAPI.prototype._setMiddleware =
function () {
    this.server.use(restify.acceptParser(this.server.acceptable));
    this.server.use(restify.bodyParser());
    this.server.use(restify.queryParser());
};



/*
 * Sets all routes for the ZAPI server
 */
DAPI.prototype._setRoutes =
function () {
    var self = this;

    function addProxies(req, res, next) {
        req.config = self.config;
        req.algorithms = self.algorithms;

        return next();
    }

    var before = [
        addProxies
    ];

    allocation.mount(self.server, before);
};



/*
 * Loads all algorithms listed in the config file. If no algorithms is listed
 * then a default random server algorithm will be used.
 */
DAPI.prototype._loadAlgorithms =
function () {
    var self = this;

    var algorithms = self.config.algorithms;
    if (!algorithms) {
        self.log.info('No algorithms listed, defaulting to random');
        algorithms = ['random'];
    }

    for (var i = 0; i < algorithms.length; i++) {
        var fileName = algorithms[i];
        var algorithm = self._loadAlgorithm(fileName);

        if (algorithm)
            self.algorithms.push(algorithm);
    }

    if (!self.algorithms.length) {
        self.log.error('No valid algorithms found');
        process.exit(1);
    } else {
        var algoNames = self.algorithms.map(function (algo) {
            return algo.name;
        });

        self.log.info('Loaded the following algorithms: ', algoNames);
    }
};



/*
 * Load an algorithms from a file. Return the algorithm if valid.
 */
DAPI.prototype._loadAlgorithm =
function (fileName) {
    var self = this;
    var algoPath = ALGORITHMS_PATH + fileName;

    try {
        var algorithm = require(algoPath);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND')
            throw (e);

        self.log.error('Algorithm not found: ', algoPath);
        return null;
    }

    if (!algorithm.run || typeof (algorithm.run) !== 'function') {
        /* JSSTYLED */
        self.log.error("Algorithm '%s' does not have a run function", fileName);
        return null;
    } else if (!algorithm.name || typeof (algorithm.name) != 'string') {
        /* JSSTYLED */
        self.log.error("Algorithm '%s' does not have a name", fileName);
        return null;
    } else {
        /* JSSTYLED */
        self.log.info("Algorithm '%s' has been loaded", fileName);
        return algorithm;
    }
};



/*
 * Starts listening on the port given specified by config.api.port. Takes a
 * callback as an argument. The callback is called with no arguments
 */
DAPI.prototype.listen =
function (callback) {
    var self = this;

    self.server.listen(this.config.api.port, '0.0.0.0', function () {
        self.log.info({ url: self.server.url },
                      '%s listening', self.server.name);

        if (callback)
            callback();

        return;
    });
};



module.exports = DAPI;
