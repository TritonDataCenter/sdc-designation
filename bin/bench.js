/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var Allocator = require('../lib/allocator.js');
var assert = require('assert');
var Logger = require('bunyan');
var restify = require('restify');
var uuid = require('node-uuid');

var MiB = 1024 * 1024;
var GiB = 1024 * MiB;



function genServers(numServers, serverRam, numVmsPerServer) {
    var reservationRatio = 0.15;
    var numRacks = numServers / 24;
    var vmRam = serverRam * (1 - reservationRatio - 0.05) / numVmsPerServer;

    var servers = [];

    for (var i = 0; i !== numServers; i++) {
        var server = {
            uuid: uuid(),
            setup: true,
            reserved: false,
            status: 'running',
            memory_total_bytes: serverRam * MiB,
            memory_available_bytes: serverRam * MiB * reservationRatio,
            disk_pool_size_bytes: 3600 * GiB,
            disk_installed_images_used_bytes: 100 * GiB,
            disk_zone_quota_bytes: 0,
            disk_kvm_quota_bytes: 0,
            reservation_ratio: reservationRatio,
            rack_identifier: 'ams-' + i % numRacks,
            sysinfo: {
                'Zpool Size in GiB': 3600,
                'CPU Total Cores': 24,
                'SDC Version': '7.0',
                'Live Image': '20140410T203034Z',
                'Network Interfaces': {
                    e1000g0: {
                        'Link Status': 'up',
                        'NIC Names': [ 'external' ]
                    },
                    e1000g1: {
                       'Link Status': 'up',
                       'NIC Names': [ 'admin' ]
                    }
                }
            },
            vms: {}
        };

        for (var j = 0; j !== numVmsPerServer; j++) {
            var cpu = server.sysinfo['CPU Total Cores'];

            var vm = {
                uuid: uuid(),
                owner_uuid: '98c9f65b-ad6d-4819-bb27-5d00dd54de29',
                // owner_uuid: uuid(),
                cpu_cap: 4 * cpu / numVmsPerServer * 100,
                quota: 15,
                max_physical_memory: vmRam,
                zone_state: 'running',
                state: 'running',
                last_modified: '2012-12-19T05:26:05.000Z'
            };

            server.vms[vm.uuid] = vm;
            server.disk_zone_quota_bytes += 15 * GiB;
            server.memory_available_bytes -= vmRam * MiB;
        }

        servers.push(server);
    }

    return servers;
}



function bench(name, driver, numServers, serverRam, numVmsPerServer, callback) {
    var servers = genServers(numServers, serverRam, numVmsPerServer);

    var data = {
        servers: servers,
        vm: {
            vm_uuid: uuid(),
            ram: 256,
            owner_uuid: '98c9f65b-ad6d-4819-bb27-5d00dd54de29',
            nic_tags: ['external', 'admin']
        },
        image: {
            image_size: 51200,
            requirements: {
                min_platform: {
                    '7.0': '20121218T203452Z'
                }
            }
        },
        package: {}
    };

    driver(name, data, callback);
}



function http(name, data, callback) {
    var json = JSON.stringify(data);

    var client = restify.createStringClient({
        agent: false,
        url: 'http://localhost:8080',
        version: '*',
        retryOptions: { retry: 0 },
        contentType: 'application/json',
        accept: 'application/json'
    });

    var start = new Date();

    client.post('/allocation', json, function (err, req, res, body) {
        console.log(name, 'time:', (new Date() - start) / 1000);

        assert.ifError(err);
        assert.equal(res.statusCode, 200);

        if (callback)
            callback();
    });
}



function direct(name, data, callback) {
var logStub = { trace: function () { return true; },
                debug: function () { return true; },
                info:  function () { return true; },
                warn:  function () { return true; },
                error: function (err) { console.log(err); return true; } };

    var allocator = new Allocator(logStub);

    var start = new Date();
    var results = allocator.allocate(data.servers, data.vm, data.image,
                                     data.package);
    assert.ok(results[0]);
    console.log(name, 'time:', (new Date() - start) / 1000);

    if (callback)
        callback();
}



function main() {
    var driver;

    if (process.argv[2] === '--http') {
        console.log('Using HTTP driver');
        driver = http;
    } else {
        console.log('Using direct driver');
        driver = direct;
    }

    bench('current', driver, 300, 80 * 1024, 25, function () {
        bench('high', driver, 40 * 25, 128 * 1024, 192, function () {
            bench('ridiculous', driver, 40 * 25, 128 * 1024, 768);
        });
    });
}



main();
