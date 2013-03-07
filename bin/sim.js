/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Runs simulation on DAPI, taking zone data recorded on live production.
 *
 * A query is run on an SDC65 MAPI DB and dumped to a textfile, thus the file
 * contains information about how large a zone was, when it was creaetd, when
 * it was destroyed, and so on. This program takes that data, then feeds it one
 * allocation request at a time to DAPI, keeping track of which servers DAPI
 * allocated each zone to (and removing them when it's their time to be
 * destroyed). An overall view is available which shows how many zones are on
 * each server, what percent RAM they're using, and in which rack a server is --
 * each line on the screen being a rack, and each number pair being a server.
 */



var fs      = require('fs');
var restify = require('restify');
var uuid    = require('node-uuid');



var PRODUCTION_RESULTS = 'east.txt';
var NUM_SERVERS = 240;
var SERVER_RAM = 98292; // in MiB
var SERVER_DISK = 3600; // in GiB
var SERVERS_PER_RACK = 14;
var DAPI_URL = 'http://localhost:8080';
var ALLOCATION_DELAY = 200; // in ms



/*
 * Loads relevant information about each zone from a SQL results table.
 * dumped to a file. An array is returned where each object represents a zone.
 */

function loadZoneData(filename) {
    var fileData = fs.readFileSync(filename, 'ascii');

    var sqlRows = fileData.split('\n');
    sqlRows.shift();
    sqlRows.shift();
    sqlRows.pop();

    var zoneData = sqlRows.map(function (row) {
        var elements = row.split(/\s+\|\s+/);

        var vmUuid = uuid();
        var ram = +elements[0].match(/\d+/)[0];
        var disk = +elements[1];
    //    var swap = +elements[2];
        var ownerUuid = elements[3];
        var createdAt = new Date(elements[5]);
        var destroyedAt = elements[6].length > 0 ? new Date(elements[6]) : null;

        var zone = {
            uuid: vmUuid,
            ram: ram,
            disk: disk,
            ownerUuid: ownerUuid,
            createdAt: createdAt,
            destroyedAt: destroyedAt
        };

        return zone;
    });

    return zoneData;
}



/*
 * Retuns a list of zones where they're sorted by date of creation.
 */

function orderZonesByCreation(zoneHistory) {
    var sortedZones = zoneHistory.sort(function (a, b) {
        if (a.createdAt > b.createdAt)
            return 1;
        return -1;
    });

    return sortedZones;
}



/*
 * Returns a list of zones where they're sorted by date of destruction.
 */

function orderZonesByDestruction(zoneHistory) {
    var destroyedZones = zoneHistory.filter(function (zone) {
        return zone.destroyedAt;
    });

    var sortedZones = destroyedZones.sort(function (a, b) {
        if (a.destroyedAt > b.destroyedAt)
            return 1;
        return -1;
    });

    return sortedZones;
}



/*
 * Takes a list of zones sorted by when they were created, and a list of zones
 * sorted by when they were destroyed, and returns a list of occurances
 * (creation and destruction) of each zone sorted by date.
 */

function activitiesByDate(createdList, destroyedList) {
    var activity;
    var remainder;
    var activities = [];

    while (createdList.length > 0 && destroyedList.length > 0) {
        if (createdList[0].createdAt <= destroyedList[0].destroyedAt) {
            activity = ['create', createdList.shift()];
        } else {
            activity = ['destroy', destroyedList.shift()];
        }

        activities.push(activity);
    }

    if (createdList.length > 0) {
        remainder = createdList.map(function (zone) {
            return ['create', zone];
        });
    } else if (destroyedList.length > 0) {
        remainder = destroyedList.map(function (zone) {
            return ['destroy', zone];
        });
    }

    activities = activities.concat(remainder);

    return activities;
}



/*
 * Returns a list of events (zone creation and destruction) to zones sorted by
 * date, after the zone data is loaded from a data file.
 */

function createActivityList(filename) {
    var zoneHistory = loadZoneData(filename);
    var createdList = orderZonesByCreation(zoneHistory);
    var destroyedList = orderZonesByDestruction(zoneHistory);
    var activityList = activitiesByDate(createdList, destroyedList);

    return activityList;
}



/*
 * Create a simplified version of what CNAPI returns, which can be passed to
 * DAPI.
 */

function createServer(ram, disk, rackId) {
    var serverUuid = uuid();
    var ramBytes   = ram * 1024 * 1024;
    var availBytes = Math.floor(ramBytes * 0.625);
    var arcBytes   = Math.floor(ramBytes * 0.11);

    var server = {
        uuid: serverUuid,
        sysinfo: {
            'Live Image': '20121218T203452Z',
            'VM Capable': true,
            'CPU Virtualization': 'none',
            'CPU Physical Cores': 2,
            'CPU Total Cores': 2,
            'MiB of Memory': '' + ram,
            'Zpool Size in GiB': disk },
        reserved: false,
        headnode: false,
        setup: true,
        status: 'running',
        memory_available_bytes: availBytes,
        memory_arc_bytes: arcBytes,
        memory_total_bytes: ramBytes,
        rack_identifier: rackId,
        traits: {},
        vms: {}
    };

    return server;
}



/*
 * Create a VM object which can be passed to DAPI as part of the server object.
 */

function createVm(vmUuid, ram, disk, ownerUuid) {
    var vm = {
        uuid: vmUuid,
        owner_uuid: ownerUuid,
        quota: disk,
        max_physical_memory: ram,
        zone_state: 'running',
        state: 'running'
    };

    return vm;
}



/*
 * Adds a VM object to a server object for a given server UUID.
 */

function addVmToServer(vm, servers, serverUuid) {
    for (var i = 0; i !== servers.length; i++) {
        var server = servers[i];

      if (server.uuid === serverUuid) {
          server.vms[vm.uuid] = vm;
          return;
      }
    }
}



/*
 * Removes a VM object from all servers -- although technically it'll only ever
 * be in a single server.
 */

function removeVmFromServers(vm, servers) {
    for (var i = 0; i !== servers.length; i++)
        delete servers[i].vms[vm.uuid];
}



/*
 * Create a group of server objects, and assign them to racks.
 */

function createServers(numServers, ram, disk) {
    var servers = [];

    for (var i = 0; i !== numServers; i++) {
        var rackId = '' + Math.floor(i / SERVERS_PER_RACK);
        var server = createServer(ram, disk, rackId);
        servers.push(server);
    }

    return servers;
}



/*
 * Create a client to communicate over HTTP with DAPI.
 */

function createClient(url) {
    var clientOpts = {
        url: url,
        version: '*',
        retryOptions: { retry: 0 },
        agent: false
    };

    var client = restify.createJsonClient(clientOpts);

    return client;
}



/*
 * Display a pair of numbers for a server. The first number is how many VMs
 * there are on a server. The second number is what percentage of RAM on the
 * server is taken up by VMs. Some colour is included.
 */

function renderServer(server, highlight) {
    var vms = server.vms;
    var numVms = Object.keys(vms).length;

    var ramUsed = Object.keys(vms).reduce(function (sum, vmUuid) {
        return sum + vms[vmUuid].max_physical_memory;
    }, 0);

    var ratioFull = ramUsed / (server.memory_total_bytes / 1024 / 1024);
    var percentFull = Math.floor(100 * ratioFull);

    var str;
    if (highlight) {
        str = '\033[31m' + numVms + ' ' + percentFull;
    } else {
        str = '\033[34m' + numVms + ' \033[32m' + percentFull;
    }

    return str;
}



/*
 * Display the RAM each VM is taking on each server.
 */

function displayVmLayout(servers) {
    var rows = [];

    for (var i = 0; i !== servers.length; i++) {
        var server = servers[i];
        var vmNames = Object.keys(server.vms);
        var vms = vmNames.map(function (vmName) { return server.vms[vmName]; });
        var vmSizes = vms.map(function (vm) { return vm.max_physical_memory; });

        if (vmSizes.length > 0) {
            rows.push('' + vmSizes);
        } else {
            rows.push('-');
        }

        if (rows.length % SERVERS_PER_RACK !== rows.length) {
            var line = rows.join('\t');
            console.log(line);
            rows = [];
        }
    }

    var str = rows.join('\t');
    console.log(str);
}



/*
 * Displays all servers in their racks, and how many VMs are on each server.
 */

function displayLayout(servers, newestServerUuid, vmUuid, removedVmUuids) {
    console.log('\033[2J'); // clear screen

    for (var i = 0; i !== removedVmUuids.length; i++)
        console.log('Remove VM', removedVmUuids[i]);

    console.log('Add VM', vmUuid, 'to server', newestServerUuid);
    console.log();

    var rows = [];

    for (i = 0; i !== servers.length; i++) {
        var server = servers[i];
        var highlight = (server.uuid === newestServerUuid);

        var serverStr = renderServer(server, highlight);
        rows.push(serverStr);

        if (rows.length % SERVERS_PER_RACK !== rows.length) {
            var line = rows.join('\t');
            console.log(line);
            rows = [];
        }
    }

    // hack
    var str = rows.join('\t');
    console.log(str);

    console.log('\033[m'); // reset to normal colours
    console.log('(q)uit, (n)ext, (d)etails, iterations: ' +
                '10^(1) 10^(2) 10^(3) 10^(4)');
}



/*
 * Adds or removes a VM from a server, depending upon what the activity list
 * says. Adding involves calling out to DAPI so it can determine which server
 * the next VM should go onto.
 */

function allocate(client, activityList, servers) {
    var removedVmUuids = [];
    var activity = activityList.shift();

    while (activity && activity[0] === 'destroy') {
        var vm = activity[1];
        removeVmFromServers(vm, servers);
        removedVmUuids.push(vm.uuid);

        activity = activityList.shift();
    }

    if (! activity)
        return process.exit();

    // otherwise we're creating
    var vmUuid = activity[1].uuid;
    var ram = activity[1].ram;
    var disk = activity[1].disk;
    var ownerUuid = activity[1].ownerUuid;

    var data = {
        servers: servers,
        vm: {
            ram: ram,
            quota: Math.floor(disk / 1024),
            owner_uuid: ownerUuid
        }
    };

    client.post('/allocation', data, function (err, req, res, body) {
        var serverUuid = body.uuid;

        if (! serverUuid) {
            console.dir(body);
            console.log(res.statusCode);
            process.exit(1);
        }

        var createdVm = createVm(vmUuid, ram, disk, ownerUuid);
        addVmToServer(createdVm, servers, body.uuid);

        displayLayout(servers, serverUuid, createdVm.uuid, removedVmUuids);
    });

    return null;
}



/*
 * Figure out what to do, and do it, based upon the given keypress.
 */

function doInputCommand(key, client, activityList, servers) {
    // ctrl-c
    if (key === 'q' || key === '\u0003') {
        process.exit();
    }

    if (key === 'n' || key === ' ') {
        allocate(client, activityList, servers);
    }

    if (key === 'd') {
        displayVmLayout(servers);
    }

    if (key === '1' || key === '2' || key === '3' || key === '4') {
        var iterations = Math.pow(10, key);

        var intervalId = setInterval(function () {
            allocate(client, activityList, servers);

            iterations--;
            if (iterations === 0)
              clearInterval(intervalId);
        }, ALLOCATION_DELAY);
    }
}



/*
 * Wait for a key to be pressed, then perform the appropriate action as a
 * result.
 */

function waitOnInput(client, activityList, servers) {
    var stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.setEncoding('ascii');
    stdin.resume();

    stdin.on('data', function (key) {
        stdin.pause();

        doInputCommand(key, client, activityList, servers);

        setTimeout(function () {
            stdin.resume();
        }, ALLOCATION_DELAY);
    });
}



function main() {
    var activityList = createActivityList(PRODUCTION_RESULTS);
    var servers = createServers(NUM_SERVERS, SERVER_RAM, SERVER_DISK);
    var client = createClient(DAPI_URL);

    allocate(client, activityList, servers);
    waitOnInput(client, activityList, servers);
}



main();
