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
}



/*
 * DAPI init code. Will throw exception when config is bad
 */
DAPI.prototype.init = function () {
    var self = this;
    var config = this.config;


    // Init logger

    var log = self.log = new Logger({
        name: 'dapi',
        level: config.logLevel,
        serializers: {
            err: Logger.stdSerializers.err,
            req: Logger.stdSerializers.req,
            res: restify.bunyan.serializers.response
        }
    });

    self.server = restify.createServer({
        name: 'Designation API',
        log: log,
        version: config.version,
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


    // Init Server middleware

    self.setMiddleware();
    self.setStaticRoutes();
    self.setRoutes();
    self.loadAlgorithms();
};



/*
 * Sets custom middlewares to use for the API
 */
DAPI.prototype.setMiddleware = function () {
    this.server.use(restify.acceptParser(this.server.acceptable));
    this.server.use(restify.bodyParser());
    this.server.use(restify.queryParser());
};



/*
 * Sets all routes for static content
 */
DAPI.prototype.setStaticRoutes = function () {
    return;
};



/*
 * Sets all routes for the ZAPI server
 */
DAPI.prototype.setRoutes = function () {
    var self = this;

    function addProxies(req, res, next) {
        req.config = self.config;
        req.algorithms = self.algorithms;

        return next();
    }

    var before = [
        addProxies
    ];

    allocation.mount(this.server, before);
};



/*
 * Loads all algorithms listed in the config file. If no algorithms is listed
 * then a default random server algorithm will be used.
 */
DAPI.prototype.loadAlgorithms = function () {
    var self = this;

    var algorithms = self.config.algorithms;
    if (!algorithms) {
        self.log.info('No algorithms listed, defaulting to random');
        algorithms = ['random'];
    }

    for (var i = 0; i < algorithms.length; i++) {
        try {
            var fileName = algorithms[i];
            var alg = require(ALGORITHMS_PATH + fileName);

            if (!alg.run || (typeof (alg.run) != 'function')) {
                self.log.error('Algorithm ' + fileName + ' does not have a' +
                               ' run function');
            } else if (!alg.name || (typeof (alg.name) != 'string')) {
                self.log.error('Algorithm ' + fileName + ' does not have a' +
                               ' name');
            } else {
                self.log.info('Algorithm ' + fileName + ' has been loaded');
                self.algorithms.push(alg);
            }
        } catch (e) {
            self.log.error('Could not load algorithm ' + fileName);
        }
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
 * Starts listening on the port given specified by config.api.port. Takes a
 * callback as an argument. The callback is called with no arguments
 */
DAPI.prototype.listen = function (callback) {
    var self = this;

    this.server.listen(this.config.api.port, '0.0.0.0', function () {
        self.log.info({ url: self.server.url },
                      '%s listening', self.server.name);

        if (callback)
            callback();
        return;
    });
};


module.exports = DAPI;
