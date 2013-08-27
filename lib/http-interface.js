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
var SDC_VERSION_RE = /^\d\.\d$/;
var SAFETY_DELTA = 0.01;  // just some margin when treating floats as integers
var VALID_SERVER_OVERPROVISION_RESOURCES = ['cpu', 'ram', 'disk', 'io', 'net'];



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
                     self._validateVmPayload,
                     self._validateServers,
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

    if (!vm)
        return next(new restify.MissingParameterError('"vm" is required'));

    var invalidErr = restify.InvalidArgumentError;

    var msg = validateVm(vm);
    if (msg)
        return next(new invalidErr(msg));

    var requirements = req.params.image.requirements;

    if (requirements) {
        var minRam = requirements.min_ram;
        if (minRam && vm.ram < minRam - SAFETY_DELTA)
            return next(new invalidErr('"vm.ram" is smaller than ' +
                                       '"image.requirements.min_ram"'));

        var maxRam = requirements.max_ram;
        if (maxRam && vm.ram > maxRam + SAFETY_DELTA)
            return next(new invalidErr('"vm.ram" is larger than ' +
                                       '"image.requirements.max_ram"'));
    }

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

    req.params.servers = validServers;
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

    var errMsg = imageError(req.params.image);
    if (errMsg)
        var err = new restify.InvalidArgumentError(errMsg);

    return next(err);
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

    if (!Array.isArray(images))
        return next(new restify.InvalidArgumentError('"images" is not an ' +
                                                     'array'));

    for (var i = 0; i !== images.length; i++) {
        var image = images[i];
        var errMsg = imageError(image);

        if (errMsg) {
            errMsg = 'image uuid "' + image.uuid + '" - ' + errMsg;
            return next(new restify.InvalidArgumentError(errMsg));
        }
    }

    return next(null);
};



/*
 * Validates an image. Returns an error message if validation fails.
 */
function imageError(image) {
    if (typeof (image) !== 'object')
        return '"image" has invalid type';

    var imgSize = image.image_size;
    if (imgSize && typeof (imgSize) !== 'number')
        return '"image.image_size" has invalid type';

    if (image.traits) {
        var msg = validateTraits(image.traits);
        if (msg)
            return msg;
    }

    if (image.requirements) {
        var requirements = image.requirements;
        var prefix = 'requirements.';

        if (typeof (requirements) !== 'object')
            return '"image.requirements" is invalid';

        msg = validatePlatformLimits(requirements, 'min_platform', prefix);
        if (msg)
            return msg;

        msg = validatePlatformLimits(requirements, 'max_platform', prefix);
        if (msg)
            return msg;

        var minRam = requirements.minRam;
        if (minRam && typeof (minRam) !== 'number')
            return '"image.requirements.min_ram" has invalid type';

        var maxRam = requirements.maxRam;
        if (maxRam && typeof (maxRam) !== 'number')
            return '"image.requirements.max_ram" has invalid type';
    }

    return null; // keep javascriptlint happy
}



/*
 * Validates the package has required and valid properties. Numbers in package
 * attributes are currently represented as strings, so we need to accept both
 * proper numbers and numbers represented as strings.
 */
HTTP.prototype._validatePackage =
function (req, res, next) {
    req.log.trace('validatePackage start');

    var pkg = req.params.package;

    if (!pkg)
        return next();

    var err = packageError(pkg);
    if (err)
        return next(new restify.InvalidArgumentError(err));

    return next();
};



/*
 * Validates the packages parameter has required and valid properties on all
 * given packages.
 */
HTTP.prototype._validatePackages =
function (req, res, next) {
    req.log.trace('validatePackages start');

    var errMsg;
    var pkgs = req.params.packages;

    if (!pkgs) {
        errMsg = '"packages" is required';
        return next(new restify.MissingParameterError(errMsg));
    }

    if (!Array.isArray(pkgs)) {
        errMsg = '"packages" is not an array';
        return next(new restify.InvalidArgumentError(errMsg));
    }

    for (var i = 0; i !== pkgs.length; i++) {
        var pkg = pkgs[i];
        errMsg = packageError(pkg);

        if (errMsg) {
            errMsg = 'image uuid "' + pkg.uuid + '" - ' + errMsg;
            return next(new restify.InvalidArgumentError(errMsg));
        }
    }

    return next();
};



/*
 * Validates a package. Returns an error message if validation fails.
 */
function packageError(pkg) {
    if (typeof (pkg) !== 'object')
        return '"package" has invalid type';

    var overprovisionCpu = pkg.overprovision_cpu;
    if (overprovisionCpu && Number.isNaN(+overprovisionCpu))
        return '"package.overprovision_cpu" has invalid type';

    var overprovisionRam = pkg.overprovision_memory;
    if (overprovisionRam && Number.isNaN(+overprovisionRam))
        return '"package.overprovision_memory" has invalid type';

    var overprovisionDisk = pkg.overprovision_storage;
    if (overprovisionDisk && Number.isNaN(+overprovisionDisk))
        return '"package.overprovision_storage" has invalid type';

    var overprovisionNet = pkg.overprovision_network;
    if (overprovisionNet && Number.isNaN(+overprovisionNet))
        return '"package.overprovision_network" has invalid type';

    var overprovisionIo = pkg.overprovision_io;
    if (overprovisionIo && Number.isNaN(+overprovisionIo))
        return '"package.overprovision_io" has invalid type';

    var parse = function (name, validator) {
        var val = pkg[name];

        if (!val)
            return null;

        // ugly hack
        if (typeof (val) === 'string') {
            try {
                pkg[name] = JSON.parse(val);
            } catch (e) {
                return '"package.' + name + '" has invalid type';
            }
        }

        var msg = validator(pkg, name, 'package.');
        if (msg)
            return msg;

        return null;
    };

    var minPlatformErr = parse('min_platform', validatePlatformLimits);
    if (minPlatformErr)
        return minPlatformErr;

    var maxPlatformErr = parse('max_platform', validatePlatformLimits);
    if (maxPlatformErr)
        return maxPlatformErr;

    var traitShim = function () { return validateTraits(pkg.traits); };
    var traitErr = parse('traits', traitShim);
    if (traitErr)
        return traitErr;

    return null; // keep javascriptlint happy
}



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

    var results = req.allocator.allocate(servers, vm, img, pkg);
    var server = results[0];
    var algoSummaries = results[1];

    var timeElapsed = Math.floor(new Date() - startTime);
    req.log.info('Allocation took', timeElapsed, 'ms');

    if (!server) {
        var errMsg = { code: 'InvalidArgument',
                       message: 'No allocatable servers found',
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

    var capacities = req.allocator.capacity(servers, images, packages);

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

    var sUuid = server.uuid;

    if (typeof (sUuid) !== 'string')
        return 'Server UUID is not a string';

    if (!UUID_RE.test(sUuid))
        return 'Server UUID ' + sUuid + ' is not a valid UUID';

    if (typeof (server.memory_available_bytes) !== 'number')
        return 'Server ' + sUuid +
               ' memory_available_bytes is not a number';

    if (typeof (server.memory_total_bytes) !== 'number')
        return 'Server ' + sUuid + ' memory_total_bytes is not a number';

    if (typeof (server.disk_pool_size_bytes) !== 'number')
        return 'Server ' + sUuid + ' disk_pool_size_bytes is not a number';

    if (typeof (server.disk_installed_images_used_bytes) !== 'number')
        return 'Server ' + sUuid + ' disk_installed_images_used_bytes is not ' +
               'a number';

    if (typeof (server.disk_zone_quota_bytes) !== 'number')
        return 'Server ' + sUuid + ' disk_zone_quota_bytes is not a number';

    if (typeof (server.disk_kvm_quota_bytes) !== 'number')
        return 'Server ' + sUuid + ' disk_kvm_quota_bytes is not a number';

    if (typeof (server.reserved) !== 'boolean')
        return 'Server ' + sUuid + ' "reserved" is not a boolean';

    if (typeof (server.setup) !== 'boolean')
        return 'Server ' + sUuid + ' "setup" is not a boolean';

    if (typeof (server.reservation_ratio) !== 'number')
        return 'Server ' + sUuid + ' "reservation_ratio" is not a number';

    if (server.reservation_ratio < 0 || server.reservation_ratio > 1)
        return 'Server ' + sUuid + ' "reservation_ratio" out of range';

    if (server.overprovision_ratios) {
        var ratios = server.overprovision_ratios;

        if (typeof (ratios) !== 'object')
            return 'Server ' + sUuid + ' "overprovision_ratios" is not an ' +
                   'object';

        var ratioResources = Object.keys(ratios);

        for (var i = 0; i !== ratioResources.length; i++) {
            var resource = ratioResources[i];
            var ratio = ratios[resource];

            if (VALID_SERVER_OVERPROVISION_RESOURCES.indexOf(resource) === -1)
                return 'Server ' + sUuid + ' resource "' + resource +
                       '" is not a valid resource';

            if (typeof (ratio) !== 'number')
                return 'Server ' + sUuid + ' resource value "' +
                       ratio + '" for resource "' + resource +
                       '" is not a number';
        }
    }

//    if (typeof (sysinfo) !== 'object')
//        return 'Server ' + sUuid + ' "sysinfo" is malformed';

//    if (typeof (server.sysinfo['Zpool Size in GiB']) !== 'number')
//        return 'Server ' + sUuid +
//               ' "Zpool Size in GiB" is not a number';

//    if (typeof (server.sysinfo['CPU Total Cores']) !== 'number')
//        return 'Server ' + sUuid +
//               ' "CPU Total Cores" is not a number';

    if (server.traits) {
        var msg = validateTraits(server.traits);
        if (msg)
            return 'Server ' + msg;
    }

    if (server.vms) {
        var vms = server.vms;

        if (typeof (vms) !== 'object')
            return 'Server ' + sUuid + ' "vms" is not an object';

        var vmUuids = Object.keys(vms);

        for (i = 0; i != vmUuids.length; i++) {
            var vmUuid = vmUuids[i];
            var vm = vms[vmUuid];

            if (!UUID_RE.test(vm.owner_uuid))
                return 'VM ' + vmUuid + ' in server ' + sUuid +
                       ' has malformed owner_uuid ' + vm.owner_uuid;

            if (typeof (vm.max_physical_memory) !== 'number')
                return 'VM ' + vmUuid + ' in server ' + sUuid +
                       ' max_physical_memory is not a number';

//            if (typeof (vm.quota) !== 'number')
//                return 'VM ' + vmUuid + ' in server ' + sUuid +
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

    if (!UUID_RE.test(vm.owner_uuid))
        return 'VM "owner_uuid" is not a valid UUID';

    if (typeof (vm.ram) !== 'number')
        return 'VM "ram" is not a number';

    if (vm.quota && typeof (vm.quota) !== 'number')
        return 'VM "quota" is not a number';

    if (vm.cpu_cap && typeof (vm.cpu_cap) !== 'number')
        return 'VM "cpu_cap" is not a number';

    if (vm.traits) {
        var msg = validateTraits(vm.traits);
        if (msg)
            return 'VM ' + msg;
    }

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
 * Checks that [min|max]_platform are in an acceptable format.
 */
function validatePlatformLimits(requirements, requirementName, prefix) {
    var platforms = requirements[requirementName];

    if (platforms === undefined)
        return null;

    var path = prefix + requirementName;

    if (typeof (platforms) !== 'object' || Array.isArray(platforms))
        return '"' + path + '" is not a hash';

    var versions = Object.keys(platforms);

    for (var i = 0; i !== versions.length; i++) {
        var version = versions[i];
        var timestamp = platforms[version];

        if (typeof (version) !== 'string' || !version.match(SDC_VERSION_RE))
            return '"' + path + '" contains an invalid SDC version';

        if (typeof (timestamp) !== 'string' || !timestamp.match(PLATFORM_RE))
            return '"' + path + '" contains an invalid platform date';
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
