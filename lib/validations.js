/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * This file contains all validation functions used by DAPI. When an allocation
 * request is made, we want to check that all the objects being provided to
 * DAPI in the request are present and in an expected format, to enforce some
 * invariants assumed by later code.
 *
 * Most this code is called from the HTTP interface, but some is invoked by
 * plugins.
 */



var PLATFORM_RE = /^20\d\d[01]\d[0123]\dT[012]\d[012345]\d\d\dZ$/;
var SAFETY_DELTA = 0.01;  // just some margin when treating floats as integers
var SDC_VERSION_RE = /^\d\.\d$/;
var UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
var VALID_SERVER_OVERPROVISION_RESOURCES = ['cpu', 'ram', 'disk', 'io', 'net'];



/*
 * Validates if a vm is a valid vm object.
 */

function validateVm(vm) {
    if (typeof (vm) !== 'object' || Array.isArray(vm))
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

    if (vm.locality) {
        msg = validateLocality(vm.locality);
        if (msg)
            return 'VM' + msg;
    }

    return null; // keep javascriptlint happy
}



/*
 * Checks that all trait attributes are valid. Returns an error message if there
 * was a validation error.
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

                if (typeof (element) !== 'string')
                    return 'Trait "' + key + '" contains invalid type in array';
            }
        }
    }

    return null; // keep javascriptlint happy
}



/*
 * Checks that [min|max]_platform are in an acceptable format. Returns an error
 * message if not.
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

    return null; // keep javascriptlint happy
}



/*
 * Checks that if a locality hint exists, it has the expected format -- it is
 * a hash, 'near' and 'far' are valid keys, and values must be either UUIDs or
 * arrays of UUIDs. Returns an error message if there was a validation error.
 */

function validateLocality(locality) {
    if (!locality)
        return null;

    if (typeof (locality) !== 'object' || Array.isArray(locality))
       return '"locality" is has wrong type';


    var check = function (hintName) {
        var hint   = locality[hintName];
        var errKey = '"locality.' + hintName + '"';

        if (hint) {
            if (typeof (hint) !== 'string' && !Array.isArray(hint))
                return errKey + ' is neither string nor array';

            if (typeof (hint) === 'string' && !UUID_RE.test(hint))
                return errKey + ' is not a UUID';

            if (Array.isArray(hint)) {
                for (var i = 0; i !== hint.length; i++) {
                    if (!UUID_RE.test(hint[i]))
                        return errKey + ' contains an malformed UUID';
                }
            }
        }

        return null;
    };

    var msg;

    msg = check('near');
    if (msg)
        return msg;

    msg = check('far');
    if (msg)
        return msg;

    return null; // keep javascriptlint happy
}



/*
 * Validates a VM payload -- this includes the VM and checking of
 * and requirements attribute. Returns an error message if validation fails.
 */

function validateVmPayload(vm, requirements) {
    var msg = validateVm(vm);
    if (msg)
        return msg;

    if (!UUID_RE.test(vm.vm_uuid))
        return '"vm.vm_uuid" is an invalid UUID';

    if (requirements) {
        var minRam = requirements.min_ram;
        if (minRam && vm.ram < minRam - SAFETY_DELTA)
            return '"vm.ram" is smaller than "image.requirements.min_ram"';

        var maxRam = requirements.max_ram;
        if (maxRam && vm.ram > maxRam + SAFETY_DELTA)
            return '"vm.ram" is larger than "image.requirements.max_ram"';
    }

    return null; // keep javascriptlint happy
}



/*
 * This one is a bit of an odd duck. It does not validate all servers, rather
 * only checks that servers is an array. The validation of each server occurs
 * in plugin for two reasons:
 *
 * 1) so that ops can see from steps output that a server was removed, not
 *    invisibly disappearing with only a log entry they never check
 *
 * 2) We do not want to halt an allocation just because one server is invalid
 */

function validateServers(servers) {
    if (!Array.isArray(servers))
        return '"servers" input is not an array';

    if (servers.length === 0)
        return '"servers" array is empty';

    return null; // keep javascriptlint happy
}



/*
 * Validates a server. Returns an error message if validation fails.
 */

function validateServer(server) {
    if (typeof (server) !== 'object' || Array.isArray(server))
        return 'Server object is an invalid type';

    var sUuid = server.uuid;

    if (!UUID_RE.test(sUuid))
        return 'Server UUID ' + sUuid + ' is not a valid UUID';

    if (typeof (server.memory_available_bytes) !== 'number')
        return 'Server ' + sUuid + ' memory_available_bytes is not a number';

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

        if (typeof (ratios) !== 'object' || Array.isArray(ratios))
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

    var sysinfo = server.sysinfo;

    if (typeof (sysinfo) !== 'object' || Array.isArray(sysinfo))
        return 'Server ' + sUuid + ' "sysinfo" is malformed';

    if (typeof (server.sysinfo['CPU Total Cores']) !== 'number')
        return 'Server ' + sUuid + ' "CPU Total Cores" is not a number';

    if (server.traits) {
        var msg = validateTraits(server.traits);
        if (msg)
            return 'Server ' + msg;
    }

    if (server.vms) {
        var vms = server.vms;

        if (typeof (vms) !== 'object' || Array.isArray(vms))
            return 'Server ' + sUuid + ' "vms" is not an object';

        var vmUuids = Object.keys(vms);

        for (i = 0; i != vmUuids.length; i++) {
            var vmUuid = vmUuids[i];
            var vm = vms[vmUuid];

            if (!UUID_RE.test(vm.owner_uuid))
                return 'VM ' + vmUuid +
                       ' has malformed owner_uuid: ' + vm.owner_uuid;

            if (typeof (vm.max_physical_memory) !== 'number')
                return 'VM ' + vmUuid +
                       ' max_physical_memory is not a number';

            if (vm.quota && typeof (vm.quota) !== 'number')
                return 'VM ' + vmUuid +
                       ' "quota" is not a number';

            if (vm.cpu_cap && typeof (vm.cpu_cap) !== 'number')
                return 'VM ' + vmUuid +
                       ' "cpu_cap" is not a number';
        }
    }

    return null; // keep javascriptlint happy
}



/*
 * Validates an image. Returns an error message if validation fails.
 */

function validateImage(image) {
    if (typeof (image) !== 'object' || Array.isArray(image))
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

        if (typeof (requirements) !== 'object' || Array.isArray(requirements))
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
 * Validates all images. Returns an error message if any of the images is
 * invalid.
 */

function validateImages(images) {
    if (!Array.isArray(images))
        return '"images" is not an array';

    for (var i = 0; i !== images.length; i++) {
        var image = images[i];
        var msg = validateImage(image);

        if (msg)
            return 'image uuid "' + image.uuid + '" - ' + msg;
    }

    return null; // keep javascriptlint happy
}



/*
 * Validates a package. Returns an error message if validation fails.
 */

function validatePackage(pkg) {
    if (typeof (pkg) !== 'object' || Array.isArray(pkg))
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
 * Validates all packages. Returns an error message if any of the packages is
 * invalid.
 */

function validatePackages(pkgs) {
    if (!Array.isArray(pkgs))
        return '"packages" is not an array';

    for (var i = 0; i !== pkgs.length; i++) {
        var pkg = pkgs[i];
        var msg = validatePackage(pkg);

        if (msg)
            return 'package uuid "' + pkg.uuid + '" - ' + msg;
    }

    return null; // keep javascriptlint happy
}



module.exports = {
    validateVm:        validateVm,
    validateVmPayload: validateVmPayload,
    validateTraits:    validateTraits,
    validateLocality:  validateLocality,
    validateServer:    validateServer,
    validateServers:   validateServers,
    validateImage:     validateImage,
    validateImages:    validateImages,
    validatePackage:   validatePackage,
    validatePackages:  validatePackages,
    validatePlatformLimits: validatePlatformLimits
};
