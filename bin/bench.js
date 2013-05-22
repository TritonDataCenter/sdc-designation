/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var Logger = require('bunyan');
var restify = require('restify');
var uuid = require('node-uuid');




function genServers(numServers, serverRam, numVmsPerServer, vmRam) {
    var numRacks = numServers / 24;
    var servers = [];

    for (var i = 0; i !== numServers; i++) {
        var server = {
            uuid: uuid(),
            setup: true,
            reserved: false,
            status: 'running',
            memory_total_bytes: serverRam * 1024 * 1024,
            memory_available_bytes: (serverRam - 8 * 1024) * 1024 * 1024,
            rack_identifier: 'ams-' + i % numRacks,
            sysinfo: {
                'Zpool Size in GiB': 3600,
                'CPU Total Cores': 1600,
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
            var vm = {
                uuid: uuid(),
                owner_uuid: '98c9f65b-ad6d-4819-bb27-5d00dd54de29',
                // owner_uuid: uuid(),
                quota: 15,
                max_physical_memory: vmRam,
                zone_state: 'running',
                state: 'running',
                last_modified: '2012-12-19T05:26:05.000Z'
            };

            server.vms[vm.uuid] = vm;
        }

        servers.push(server);
    }

    return servers;
}



function bench(name, numServers, serverRam, numVmsPerServer, vmRam, callback) {
    var client = restify.createStringClient({
        agent: false,
        url: 'http://localhost:8080',
        version: '*',
        retryOptions: { retry: 0 },
        contentType: 'application/json',
        accept: 'application/json'
    });

    var servers = genServers(numServers, serverRam, numVmsPerServer, vmRam);
    // var data = { servers: servers, vm: { ram: vmRam, owner_uuid: uuid() } };
    var data = { servers: servers,
                 vm: { ram: vmRam,
                       owner_uuid: '98c9f65b-ad6d-4819-bb27-5d00dd54de29' } };
    var json = JSON.stringify(data);

    var start = new Date();

    client.post('/allocation', json, function (err, req, res, body) {
        console.log(name, 'time:', (new Date() - start) / 1000);

//        assert.ifError(err);
//        assert.equal(res.statusCode, 200);
//        assert.ok(body);

//        var server = JSON.parse(body);
//        console.dir(server.uuid);

        if (callback)
            callback();
    });
}



bench('current', 300, 80 * 1024, 25, 2048, function () {
    bench('high', 40 * 25, 128 * 1024, 192, 512, function () {
        bench('ridiculous', 40 * 25, 128 * 1024, 768, 128);
    });
});
