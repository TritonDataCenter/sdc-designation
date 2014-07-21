/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Starts up an HTTP server and adds a route where a server allocation can be
 * requested. It validates the request, then passes it on to an algorithm
 * pipeline to filter down the servers to the most suitable server to fulfill
 * the request. Also adds routes for pinging and simulating capacity in a DC.
 */



var assert = require('assert');
var restify = require('restify');
var Logger = require('bunyan');
var util = require('util');
var Allocator = require('./allocator');
var validations = require('./validations');



var DEFAULT_IP = '0.0.0.0';



/*
 * HTTP constructor
 */

function HTTP(options) {
    this.config = options;
    this.log = null;
    this.server = null;

    this._init();

    // this.log should be populated after _init()
    this.allocator = new Allocator(this.log, this.config.allocationDescription);
}



/*
 * HTTP init code. Connects HTTP routes, loads algorithm pipeline, and starts up
 * HTTP server.
 *
 * Will throw exception when config is bad
 */

HTTP.prototype._init =
function () {
    var self = this;

    self.log = new Logger({
        name: 'dapi',
        level: self.config.logLevel,
        serializers: restify.bunyan.serializers
    });

    self.server = restify.createServer({
        name: 'Designation API',
        log: self.log,
        version: self.config.version,
        serverName: 'SmartDataCenter',
        accept: ['text/plain',
                 'application/json'],
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

    self.server.use(restify.fullResponse());

    var logBody = Logger.resolveLevel(self.config.logLevel) < Logger.INFO;
    self.server.on('after', restify.auditLogger({
        log: self.log,
        body: logBody
    }));

    self.server.on('uncaughtException', function (req, res, route, error) {
        req.log.error({
            err: error,
            url: req.url,
            params: req.params
        });

        res.send(new restify.InternalError('Internal Server Error'));
    });

    self._setMiddleware();
    self._setRoutes();
};



/*
 * Sets custom middlewares to use for the API
 */

HTTP.prototype._setMiddleware =
function () {
    this.server.use(restify.acceptParser(this.server.acceptable));
    this.server.use(restify.bodyParser());
    this.server.use(restify.queryParser());
};



/*
 * Sets all routes for the HTTP server
 */

HTTP.prototype._setRoutes =
function () {
    var self = this;

    function addProxies(req, res, next) {
        req.config = self.config;
        req.allocator = self.allocator;

        return next();
    }

    self.server.post({ path: '/allocation', name: 'Allocation' },
                     addProxies,
                     self._validateImage,
                     self._validatePackage,
                     self._validateTickets,
                     self._validateVmPayload,
                     self._allocate);

    self.server.post({ path: '/capacity', name: 'Capacity report' },
                     addProxies,
                     self._validateImages,
                     self._validatePackages,
                     self._validateServers,
                     self._calculateCapacity);

    self.server.get({ path: '/ping', name: 'Ping' }, self._ping);
};



/*
 * Validates the 'vm' payload parameter for correct JSON required properties
 */

HTTP.prototype._validateVmPayload =
function (req, res, next) {
    req.log.trace('validateVmPayload start');

    var vm = req.params.vm;
    var requirements = req.params.image.requirements;

    if (!vm)
        return next(new restify.MissingParameterError('"vm" is required'));

    var err = validations.validateVmPayload(vm, requirements);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Validates the servers parameter for correct JSON required properties
 */

HTTP.prototype._validateServers =
function (req, res, next) {
    req.log.trace('validateServers start');

    var servers = req.params.servers;

    if (!servers)
        return next(new restify.MissingParameterError('"servers" is required'));

    var err = validations.validateServers(servers);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Validates the image parameter has required and valid properties.
 */

HTTP.prototype._validateImage =
function (req, res, next) {
    var image = req.params.image;

    req.log.trace('validateImage start');

    if (!image)
        return next(new restify.MissingParameterError('"image" is required'));

    var err = validations.validateImage(image);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Validates the images parameter has required and valid properties on all
 * given images.
 */

HTTP.prototype._validateImages =
function (req, res, next) {
    var images = req.params.images;

    req.log.trace('validateImages start');

    if (!images)
        return next(new restify.MissingParameterError('"images" is required'));

    var err = validations.validateImages(images);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Validates the package has required and valid properties. Numbers in package
 * attributes are currently represented as strings, so we need to accept both
 * proper numbers and numbers represented as strings.
 */

HTTP.prototype._validatePackage =
function (req, res, next) {
    req.log.trace('validatePackage start');

    var pkg = req.params.package;
    var img = req.params.image;

    if (!pkg)
        return next();

    var err = validations.validatePackage(pkg);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    if (pkg.os && img.os && pkg.os !== img.os) {
        var errMsg = '"package.os" and "image.os" do not match';
        return next(new restify.InvalidArgumentError(errMsg));
    }

    return next();
};



/*
 * Validates the packages parameter has required and valid properties on all
 * given packages.
 */

HTTP.prototype._validatePackages =
function (req, res, next) {
    req.log.trace('validatePackages start');

    var pkgs = req.params.packages;

    if (!pkgs) {
        var msg = '"packages" is required';
        return next(new restify.MissingParameterError(msg));
    }

    var err = validations.validatePackages(pkgs);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Validates the tickets parameter has valid properties.
 */

HTTP.prototype._validateTickets =
function (req, res, next) {
    var tickets = req.params.tickets;

    req.log.trace('validateTickets start');

    // tickets is optional
    if (!tickets)
        return next();

    var err = validations.validateTickets(tickets);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Given the request details, returns an appropriate server which the VM should
 * be allocated to.
 */

HTTP.prototype._allocate =
function (req, res, next) {
    req.log.trace('Allocation start');

    var startTime = new Date();

    var servers = req.params.servers;
    var vm      = req.params.vm;
    var img     = req.params.image;
    var pkg     = req.params.package || {};
    var tickets = req.params.tickets || [];

    var results = req.allocator.allocate(servers, vm, img, pkg, tickets);
    var server = results[0];
    var algoSummaries = results[1];

    var timeElapsed = Math.floor(new Date() - startTime);
    req.log.info('Allocation took', timeElapsed, 'ms');

    var msg = 'No allocatable servers found. Last step was: ' +
              algoSummaries.slice(-1)[0].step;

    if (!server) {
        var errMsg = { code: 'InvalidArgument',
                       message: msg,
                       steps: algoSummaries };
        return next(new restify.HttpError({ statusCode: 409, body: errMsg }));
    }

    res.send({ server: server, steps: algoSummaries });
    return next();
};



/*
 * Given a list of servers, packages and images, returns a report of how many
 * slots are available for every (package|image) combination. Some of the
 * combinations may not make sense in the context of the wider DC, but it's
 * up to the API caller to determine that, since DAPI cannot.
 */

HTTP.prototype._calculateCapacity =
function (req, res, next) {
    req.log.trace('Capacity calculation start');

    var startTime = new Date();

    var servers  = req.params.servers;
    var images   = req.params.images;
    var packages = req.params.packages;

    var capacities = req.allocator.packageCapacity(servers, images, packages);

    var timeElapsed = Math.floor(new Date() - startTime);
    req.log.info('Capacity calculations took', timeElapsed, 'ms');

    res.send({ capacities: capacities });
    return next();
};



/*
 * Just responds with an 'OK'. Ping is here for consistency with other SDC
 * services. Perhaps in the future we can make it return something interesting,
 * although with a stateless service I'm not sure what that should be.
 */

HTTP.prototype._ping =
function (req, res, next) {
    req.log.trace('Pinged');

    res.send({ status: 'running', timestamp: new Date().toISOString() });

    return next();
};



/*
 * Starts listening on the port and IP specified by config.api.port and
 * config.api.ip
 */

HTTP.prototype.listen =
function (callback) {
    var self = this;

    var ip = self.config.api.ip || DEFAULT_IP;
    var port = self.config.api.port;

    self.server.listen(port, ip, function () {
        self.log.info({ url: self.server.url },
                      '%s listening', self.server.name);

        if (callback)
            callback();

        return;
    });
};



module.exports = HTTP;
