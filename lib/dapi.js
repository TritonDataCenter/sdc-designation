/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Main entry-point for the Designation API.
 */


var restify = require('restify');
var Logger = require('bunyan');
var util = require('util');

var allocation = require('./allocation');



/*
 * DAPI constructor
 */
function DAPI(options) {
    this.config = options;
}



/*
 * DAPI init code. Will throw exception when config is bad
 */
DAPI.prototype.init = function () {
    var self = this;
    var config = this.config;


    // Init logger

    var log = this.log = new Logger({
        name: 'dapi',
        level: config.logLevel,
        serializers: {
            err: Logger.stdSerializers.err,
            req: Logger.stdSerializers.req,
            res: restify.bunyan.serializers.response
        }
    });

    this.server = restify.createServer({
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

    this.server.on('uncaughtException', function (req, res, route, error) {
        req.log.info({
            err: error,
            url: req.url,
            params: req.params
        });

        res.send(new restify.InternalError('Internal Server Error'));
    });


    // Init Server middleware

    this.setMiddleware();
    this.setStaticRoutes();
    this.setRoutes();
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
    var config = this.config;

    function addProxies(req, res, next) {
        req.config = config;

        return next();
    }

    var before = [
        addProxies
    ];

    allocation.mount(this.server, before);
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
