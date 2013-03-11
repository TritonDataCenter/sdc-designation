/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * Starts up an HTTP server and adds a route where a server allocation can be
 * requested. It validates the request, then passes it on to an algorithm
 * pipeline to filter down the servers to the most suitable server to fulfill
 * the request.
 */



var assert = require('assert');
var restify = require('restify');
var Logger = require('bunyan');
var util = require('util');
var Allocator = require('./allocator');



var DEFAULT_IP = '0.0.0.0';
var UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
var PLATFORM_RE = /^20\d\d[01]\d[0123]\dT[012]\d[012345]\d\d\dZ$/;



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

    var before = [
        addProxies
    ];

    self.server.post({ path: '/allocation', name: 'Allocation'},
                     before,
                     self._validateVmPayload,
                     self._validateServers,
                     self._validateImage,
                     self._allocate);
};



/*
 * Validates the 'vm' payload parameter for correct JSON required properties
 */
HTTP.prototype._validateVmPayload =
function (req, res, next) {
    req.log.trace('validateVmPayload start');

    var vm = req.params.vm;

    if (!vm)
        return next(new restify.MissingParameterError('"vm" is required'));

    var msg = validateVm(vm);
    if (msg)
        return next(new restify.InvalidArgumentError(msg));

    req.vm = vm;
    return next();
};



/*
 * Validates the servers parameter for correct JSON required properties
 */
HTTP.prototype._validateServers =
function (req, res, next) {
    req.log.trace('validateServers start');

    var validServers = [];
    var servers = req.params.servers;

    if (!servers) {
        return next(
            new restify.MissingParameterError('"servers" are required'));
    }

    if (!Array.isArray(servers)) {
        return next(
        new restify.MissingParameterError('"servers" input is not an array'));
    }

    if (servers.length === 0) {
        return next(
            new restify.MissingParameterError('"servers" array is empty'));
    }

    for (var i = 0; i < servers.length; i++) {
        var server = servers[i];
        var msg = validateServer(server);
        if (!msg) {
            validServers.push(server);
        } else {
            req.log.warn('Skipping server in request: ', msg);
        }
    }

    if (!validServers.length) {
        return next(
            new restify.InvalidArgumentError('No valid "servers" found'));
    }

    req.servers = validServers;
    return next();
};



/*
 * Validates the image parameter has required and valid properties.
 */
HTTP.prototype._validateImage =
function (req, res, next) {
    req.log.trace('validateImage start');

    // temporary compat shim, remove after March 20, 2013
    req.params.image = req.params.image || {};

    var image = req.params.image;

    if (!image)
        return next(new restify.MissingParameterError('"image" is required'));

    var invalidErr = restify.InvalidArgumentError;

    if (typeof (image) !== 'object')
        return next(new invalidErr('"image" has invalid type'));

    if (image.traits) {
        var msg = validateTraits(image.traits);
        if (msg)
            return next(new invalidErr(msg));
    }

    if (image.requirements) {
        var requirements = image.requirements;

        if (typeof (requirements) !== 'object')
            return next(new invalidErr('"image.requirements" is invalid'));

        msg = validatePlatformLimits(requirements, 'min_platform');
        if (msg)
            return next(new invalidErr(msg));

        msg = validatePlatformLimits(requirements, 'max_platform');
        if (msg)
            return next(new invalidErr(msg));
    }

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

    var vm = req.params.vm;
    var image = req.params.image;

    var server = req.allocator.allocate(req.servers,
                                        { ram:        vm.ram,
                                          disk:       vm.quota,
                                          nic_tags:   vm.nic_tags,
                                          traits:     vm.traits,
                                          owner_uuid: vm.owner_uuid },
                                        { traits:       image.traits,
                                          requirements: image.requirements });

    var timeElapsed = Math.floor(new Date() - startTime);
    req.log.info('Allocation took', timeElapsed, 'ms');

    if (!server) {
        return next(
            new restify.
                InvalidArgumentError('No allocatable servers found'));
    }

    res.send(server);
    return next();
};



/*
 * Validates if server is a valid server object. An example of a simplified
 * server object:
 *
 * uuid: 564d89c4-e368-1a0b-564f-b8a33f47c134
 * hostname: headnode
 * memory_total_bytes: 2943930368
 * memory_available_bytes: 1544368128
 * reserved: true
 * cpucores: 2
 * os: 20120319T230411Z
 * cpuvirtualization: none
 * status: running
 * headnode: true
 */
function validateServer(server) {
    if (typeof (server) !== 'object')
        return 'Server object is an invalid type';

    if (typeof (server.uuid) !== 'string')
        return 'Server UUID is not a string';

    if (!UUID_RE.test(server.uuid))
        return 'Server UUID ' + server.uuid + ' is not a valid UUID';

    if (typeof (server.memory_available_bytes) !== 'number')
        return 'Server ' + server.uuid +
               ' memory_available_bytes is not a number';

    if (typeof (server.memory_total_bytes) !== 'number')
        return 'Server ' + server.uuid + ' memory_total_bytes is not a number';

    if (typeof (server.reserved) !== 'boolean')
        return 'Server ' + server.uuid + ' "reserved" is not a boolean';

    if (typeof (server.setup) !== 'boolean')
        return 'Server ' + server.uuid + ' "setup" is not a boolean';

//    if (typeof (server['Zpool Size in GiB']) !== 'number')
//        return 'Server ' + server.uuid +
//               ' "Zpool Size in GiB" is not a number';

    if (server.vms) {
        var vms = server.vms;

        if (typeof (vms) !== 'object')
            return 'Server ' + server.uuid + ' "vms" is not an object';

        var vmUuids = Object.keys(vms);

        for (var i = 0; i != vmUuids.length; i++) {
            var vmUuid = vmUuids[i];
            var vm = vms[vmUuid];

            if (!UUID_RE.test(vm.owner_uuid))
                return 'VM ' + vmUuid + ' in server ' + server.uuid +
                       ' has malformed owner_uuid ' + vm.owner_uuid;

            if (typeof (vm.max_physical_memory) !== 'number')
                return 'VM ' + vmUuid + ' in server ' + server.uuid +
                       ' max_physical_memory is not a number';

//            if (typeof (vm.quota) !== 'number')
//                return 'VM ' + vmUuid + ' in server ' + server.uuid +
//                       ' "quota" is not a number';
        }
    }

    return null;
}



/*
 * Validates if a vm is a valid vm object.
 */
function validateVm(vm) {
    if (typeof (vm) !== 'object')
        return 'VM object is an invalid type';

    if (typeof (vm.ram) !== 'number')
        return 'VM "ram" is not a number';

    if (!UUID_RE.test(vm.owner_uuid))
        return 'VM "owner_uuid" is not a valid UUID';

//    if (typeof (vm.quota) !== 'number')
//        return 'VM "quota" is not a number';

    return null;
}



/*
 * Checks that all trait attributes are valid.
 */
function validateTraits(traits) {
    var keys = Object.keys(traits);

    for (var i = 0; i !== keys.length; i++) {
        var key = keys[i];
        var value = traits[key];

        if (typeof (value) !== 'boolean' &&
            typeof (value) !== 'string' &&
            !Array.isArray(value)) {
            return 'Trait "' + key + '" is an invalid type';
        }

        if (Array.isArray(value)) {
            for (var j = 0; j !== value.length; j++) {
                var element = value[j];

                if (typeof (element) !== 'string') {
                    return 'Trait "' + key + '" contains invalid type in array';
                }
            }
        }
    }

    return null;
}



/*
 * Checks that image.requirements.[min|max]_platform are an acceptable format.
 */
function validatePlatformLimits(requirements, requirementName) {
    var platform = requirements[requirementName];

    if (platform === undefined)
        return null;

    var path = 'requirements.' + requirementName;

    if (!Array.isArray(platform))
        return '"' + path + '" is not an array';

    for (var i = 0; i !== platform.length; i++) {
        var requirement = platform[i];

        if (!Array.isArray(requirement))
            return 'An element in "' + path + '" is not an array';

        if (requirement.length !== 2)
            return 'An element in "' + path + '" has an incorrect length';

        var version = requirement[0];
        var timestamp = requirement[1];

        if (typeof (version) !== 'string' || typeof (timestamp) !== 'string')
            return 'An element in "' + path + '" does not contain two strings';

        if (! timestamp.match(PLATFORM_RE))
            return '"' + path + '" contains invalid platform date';
    }

    return null;
}



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
