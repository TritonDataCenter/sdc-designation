/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* BEGIN JSSTYLED */
/*
 * Copyright 2019 Joyent, Inc.
 *
 * VM affinity support -- rules/hints for deciding to what server a new VM is
 * provisioned. We convert affinities to locality hints -- which is used further
 * down the dapi chain -- and under some circumstances filter servers too.
 *
 * The goal is to provide the affinity features that Docker Swarm provides with
 * its "affinity" container filters, described here:
 *      https://docs.docker.com/swarm/scheduler/filter/#how-to-write-filter-expressions
 * The other Swarm filters are ignored. See DOCKER-630 for discussion.
 *
 * # Affinity types
 *
 * There are three affinity axes in the Swarm docs:
 *
 * - *container affinity*: Specify to land on the same or different server
 *   as an existing VM(s):
 *      container==db0
 *
 * - *label affinity*: Specify to land on the same or different server as
 *   existing VMs with a given tag:
 *      role=webhead
 *
 * - *image affinity*: Specify to land on a node with the given image.
 *   Note: We skip this one. For Triton an image is present on all nodes in the
 *   DC.
 *
 * # Limitations
 *
 * - dapi's locality hints cannot handle mixed strict and non-strict rules.
 *   E.g.: container==db0 & container!=~db1
 *   To support that we'd need to extend the "locality" data structure format.
 *   Currently we just drop the non-strict rules when hitting this.
 */

var assert = require('assert-plus');
var format = require('util').format;
var vasync = require('vasync');
var XRegExp = require('xregexp');

var UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;


// ---- internal support stuff


/*
 * Convert a filter expression into a string.
 */
function strFromFilterExpr(expr) {
    return format('%s%s%s%s', expr.key, expr.operator, expr.isSoft ? '~' : '',
        expr.value);
}


function isUUID(str) {
    return str && str.length === 36 && str.match(UUID_RE);
}


function isInst(aff) {
    return aff.key === 'container' || aff.key === 'instance';
}


/*
 * Takes a Docker ID and returns the associated VM UUID
 */
function dockerIdToUuid(dockerId) {
    var out = dockerId.substr(0, 8) + '-'
        + dockerId.substr(8, 4) + '-'
        + dockerId.substr(12, 4) + '-'
        + dockerId.substr(16, 4) + '-'
        + dockerId.substr(20, 12);

    return out;
}


/*
 * Looks up all active VMs that have matching tag values or globs
 */
function getVmUuidsFromTagValGlob(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.affinity, 'opts.affinity');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.func(cb, 'cb');

    var aff = opts.affinity;
    var query = {
        fields: 'uuid,alias,tags',
        owner_uuid: opts.ownerUuid,
        state: 'active',
        predicate: {
            or: [
                { eq: [ 'tag.' + aff.key,              aff.value ] },
                { eq: [ 'tag.docker:label:' + aff.key, aff.value ] }
            ]
        }
    };

    opts.vmapi.listVms(query, {
        headers: { 'x-request-id': opts.log.fields.req_id }
    }, function listVmsCb(err, vms) {
        if (err) {
            cb(err);
            return;
        }

        var vmUuids = vms.map(function (vm) { return vm.uuid; });

        opts.log.debug({
            affinity: strFromFilterExpr(aff),
            vms: vmUuids
        }, 'getVmUuidsFromTagValGlob');

        cb(null, vmUuids);
    });
}


/*
 * Looks up all active VMs that have tag values which match the regex
 */
function getVmUuidsFromTagRe(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.affinity, 'opts.affinity');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.func(cb, 'cb');

    var aff = opts.affinity;
    var query = {
        fields: 'uuid,alias,tags',
        owner_uuid: opts.ownerUuid,
        state: 'active',
        predicate: {
            or: [
                { eq: [ 'tag.' + aff.key,              '*' ] },
                { eq: [ 'tag.docker:label:' + aff.key, '*' ] }
            ]
        }
    };

    opts.vmapi.listVms(query, {
        headers: {'x-request-id': opts.log.fields.req_id}
    }, function listVmsCb(err, vms) {
        if (err) {
            cb(err);
            return;
        }

        var valueRe = XRegExp(aff.value.slice(1, -1));

        var taggedVms = vms.filter(function filterOnTags(vm) {
            var tag   = vm.tags[aff.key];
            var label = vm.tags['docker:label:' + aff.key];

            return ((tag !== undefined && valueRe.test(tag.toString())) ||
                   (label !== undefined && valueRe.test(label)));
        });

        var vmUuids = taggedVms.map(function (vm) { return vm.uuid; });

        opts.log.debug({
            affinity: strFromFilterExpr(aff),
            vms: vmUuids
        }, 'getVmUuidsFromTagRe');

        cb(null, vmUuids);
    });
}


/*
 * Looks up the active VM which has a docker ID
 */
function getVmUuidFromDockerId(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.affinity, 'opts.affinity');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.func(cb, 'cb');

    var aff = opts.affinity;
    assert.ok(isInst(aff));

    var vmUuid = dockerIdToUuid(aff.value);

    opts.vmapi.getVm({
        uuid: vmUuid,
        owner_uuid: opts.ownerUuid,
        fields: 'uuid,alias,state,internal_metadata,docker'
    }, {
        headers: { 'x-request-id': opts.log.fields.req_id }
    }, function getVmCb(err, vm) {
        if (err && err.statusCode !== 404) {
            cb(err);
        } else if (!err && vm && vm.docker
            && ['destroyed', 'failed'].indexOf(vm.state) === -1
            && vm.internal_metadata['docker:id'] === aff.value)
        {
            cb(null, [vmUuid]);
        } else {
            cb(null, []);
        }
    });
}


/*
 * See getVmUuidFromName() comment
 */
function fullVmListSearch(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.affinity, 'opts.affinity');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.func(cb, 'cb');

    var cache = opts.cache;
    var aff = opts.affinity;

    // memoized call to listVms() for this owner
    function getAllActiveVms(next) {
        if (cache.allActiveVms) {
            next(null, cache.allActiveVms);
            return;
        }

        opts.vmapi.listVms({
            fields: 'uuid,alias,internal_metadata,docker',
            owner_uuid: opts.ownerUuid,
            state: 'active'
        }, {
            headers: { 'x-request-id': opts.log.fields.req_id }
        }, function (err, allActiveVms) {
            if (err) {
                next(err);
                return;
            }

            cache.allActiveVms = allActiveVms;
            next(null, allActiveVms);
        });
    }

    getAllActiveVms(function getAllCb(err, allVms) {
        if (err) {
            cb(err);
            return;
        }

        var type = aff.valueType;

        if (type === 're') {
            // Regex is only on container alias, not id
            var reRe = XRegExp(aff.value.slice(1, -1));

            var reVms = allVms.filter(function checkAlias1(_vm) {
                return _vm.alias && reRe.test(_vm.alias);
            });

            cb(null, reVms);
        } else if (type === 'glob') {
            // Glob is only on container alias, not id.
            var globRe = new RegExp('^' + aff.value.replace(/\*/g, '.*') + '$');

            var globVms = allVms.filter(function checkAlias2(_vm) {
                return _vm.alias && globRe.test(_vm.alias);
            });

            cb(null, globVms);
        } else if (type === 'exact') {
            /*
             * This is a exact name match (preferred) or id prefix. If there are
             * multiple id-prefix matches, we'll raise an ambiguity error.
             */
            var exactErr;
            var nameMatch;
            var idPrefixMatches = [];

            for (var i = 0; i < allVms.length; i++) {
                var vm = allVms[i];

                if (vm.alias && vm.alias === aff.value) {
                    nameMatch = vm;
                    break;
                }

                if (vm.docker && vm.internal_metadata['docker:id'] &&
                    vm.internal_metadata['docker:id'].indexOf(aff.value) === 0)
                {
                    idPrefixMatches.push(vm);
                }
            }

            var vms = [];

            if (nameMatch) {
                vms = [nameMatch];
            } else if (idPrefixMatches.length > 1) {
                exactErr = format('Multiple matches: %s=%j', aff.value,
                    idPrefixMatches);
            } else if (idPrefixMatches.length === 1) {
                vms = [idPrefixMatches[0]];
            }

            cb(exactErr, vms);
        } else {
            cb('Unknown affinity valueType: ' + aff.valueType);
        }
    });
}


/*
 * Looks up active VMs which have an alias matching the given regex, glob,
 * or exact match. Also performs prefix searches on docker IDs.
 */
function getVmUuidFromName(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.affinity, 'opts.affinity');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.func(cb, 'cb');

    var log = opts.log;
    var ownerUuid = opts.ownerUuid;
    var aff = opts.affinity;
    assert.ok(isInst(aff));

    /*
     * First attempt an exact name (aka alias) match as a quick out,
     * if possible.
     */
    if (aff.valueType === 'exact' || aff.valueType === 'glob') {
        opts.vmapi.listVms({
            fields: 'uuid,alias',
            owner_uuid: ownerUuid,
            state: 'active',
            // this supports simple glob
            predicate: { eq: [ 'alias', aff.value ] }
        }, {
            headers: { 'x-request-id': log.fields.req_id }
        }, function listVmsCb(err, vms_) {
            if (err) {
                done(err);
            } else if (vms_.length){
                done(null, vms_);
            } else {
                fullVmListSearch(opts, done);
            }
        });
    } else {
        fullVmListSearch(opts, done);
    }

    function done(err, vms) {
        if (err) {
            cb(err);
            return;
        }

        var vmUuids = vms.map(function (vm) { return vm.uuid; });

        log.debug({
            affinity: strFromFilterExpr(aff),
            vms: vmUuids
        }, 'getVmUuidFromName');

        cb(null, vmUuids);
    }
}


/*
 * Find the VM(s) matching the given 'affinity'.
 *
 * If `affinity.key === "container" or "instance"`, the affinity value can be
 * any of:
 *
 * - instance uuid: use that directly
 * - docker id: if at least a 32-char prefix of a docker_id, then can construct
 *   instance UUID from that and use that directly
 * - short docker id: look up all docker containers by uuid
 * - name: lookup all (not just docker) containers by alias
 * - name glob: lookup all (not just docker) containers by alias. IIUC, Swarm's
 *   implementation is just simple globbing: '*'-only
 * - name regex: lookup all (not just docker) containers by alias
 *
 * Else `affinity.key` is a tag key:
 *
 * Find any VMs matching that key/value. As above, the value can be an exact
 * value (stringified comparison), glob (simple '*'-only glob) or regex.
 *
 * Dev Note: Annoyingly we prefix docker labels with "docker:label:" on VM.tags.
 * So we search both. Note that this can look obtuse or ambiguious to the docker
 * user if a container has both 'foo' and 'docker:label:foo' VM tags.
 */
function vmUuidsFromAffinity(opts, cb) {
    assert.object(opts.affinity, 'opts.affinity');
    assert.object(opts.log, 'opts.log');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.object(opts.vmapi, 'opts.vmapi');
    assert.object(opts.cache, 'opts.cache');
    assert.func(cb, 'cb');

    var aff = opts.affinity;

    // $tag=$value
    // $tag=$glob
    if (!isInst(aff) && aff.valueType !== 're') {
        getVmUuidsFromTagValGlob(opts, cb);

    // $tag==/regex/
    // Get a all '$key=*'-tagged VMs and post-filter with `value` regex.
    } else if (!isInst(aff) && aff.valueType === 're') {
        getVmUuidsFromTagRe(opts, cb);

    // container==UUID
    } else if (isUUID(aff.value)) {
        assert.ok(isInst(aff));
        cb(null, [aff.value]);

    // container==<full 64-char docker id>
    //
    // Given a full 64-char docker id, Docker-docker will skip container
    // *name* matching (at least that's what containers.js#findContainerIdMatch
    // implies). We'll do the same here. Any other length means we need to
    // consider name matching.
    } else if (/^[a-f0-9]{64}$/.test(aff.value)) {
        getVmUuidFromDockerId(opts, cb);

    // container=<name>
    // container=<short docker id>
    // container=<name glob> (simple '*'-globbing only)
    // container=<name regex>
    } else {
        getVmUuidFromName(opts, cb);
    }
}


/*
 * Calculate locality hints from affinities. Potentially filter servers as well.
 */
function localityFromAffinity(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.vmapi, 'opts.vmapi');
    assert.array(opts.affinity, 'opts.affinity');
    assert.uuid(opts.ownerUuid, 'opts.ownerUuid');
    assert.func(cb, 'cb');

    var log = opts.log;

    var affinities = opts.affinity;
    if (affinities.length === 0) {
        cb();
        return;
    }

    /*
     * Limitation: sdc-designation's soft-filter-locality-hints.js can't
     * handle mixed hard (strict) and soft (non-strict) affinities. However,
     * while affinities just mean a specific server or not, we can effectively
     * handle this by just dropping soft affinities if there are hard ones.
     */
    var haveHard = false;
    var haveSoft = false;
    var softAffinities = [];
    var hardAffinities = [];
    for (var i = 0; i < affinities.length; i++) {
        var isSoft = affinities[i].isSoft;
        if (isSoft) {
            haveSoft = true;
            softAffinities.push(affinities[i]);
        } else {
            haveHard = true;
            hardAffinities.push(affinities[i]);
        }
    }
    if (haveHard && haveSoft) {
        log.debug({ softAffinities: softAffinities },
            'localityFromAffinity: mixed hard and soft affinities: '
            + 'drop soft affinities');
        affinities = hardAffinities;
    }

    var strict = haveHard;
    var near = [];
    var far = [];

    var cache = {};
    function setLocalityFromAff(aff, next) {
        if (aff.key === 'image') {
            log.debug({affinity: aff}, 'ignore "image" affinity');
            next();
            return;
        }

        vmUuidsFromAffinity({
            affinity: aff,
            log: log,
            ownerUuid: opts.ownerUuid,
            vmapi: opts.vmapi,
            cache: cache
        }, function uuidsCb(err, vmUuids) {
            if (err) {
                next(err);
                return;
            }

            if (vmUuids.length !== 0) {
                if (aff.operator === '==') {
                    near = near.concat(vmUuids);
                } else {
                    far = far.concat(vmUuids);
                }
                next();
                return;
            }

            /*
             * Either we drop the affinity or error out. If it is a strict '==',
             * then we need to error out (no server will match). If it is
             * non-strict, or '!=', then we are fine dropping the affinity. See
             * some discussion in DAPI-306.
             */
            if (!strict || aff.operator === '!=') {
                log.debug({ affinity: aff }, 'drop affinity, no matching vms');
                next();
            } else if (!isInst(aff)) {
                next(format('no active containers found matching tag "%s=%s" ' +
                   'for affinity "%s"', aff.key, aff.value,
                   strFromFilterExpr(aff)));
            } else {
                next(format('no active containers found matching "%s" for ' +
                    'affinity "%s"', aff.value, strFromFilterExpr(aff)));
            }
        });
    }

    vasync.forEachPipeline({
        inputs: affinities,
        func: setLocalityFromAff
    }, function forEachCb(err) {
        if (err) {
            cb(err);
        } else if (!near.length && !far.length) {
            cb();
        } else {
            var locality = {
                strict: strict
            };

            if (near.length > 0) locality.near = near;
            if (far.length > 0) locality.far = far;

            cb(null, locality);
        }
    });
}


module.exports = {
    localityFromAffinity: localityFromAffinity
};

/* END JSSTYLED */
