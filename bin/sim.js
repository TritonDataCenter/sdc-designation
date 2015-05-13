/*
 * Copyright (c) 2014, Joyent, Inc. All rights reserved.
 *
 * Runs simulation on DAPI, taking zone data recorded on live production.
 *
 * A query is run on vmapi and dumped to a textfile, thus the file contains
 * information about how large a zone was, when it was created, when
 * it was destroyed, and so on. This program takes that data, then feeds it one
 * allocation request at a time to DAPI, keeping track of which servers DAPI
 * allocated each zone to (and removing them when it's their time to be
 * destroyed). An overall view is available which shows how many zones are on
 * each server, what percent RAM they're using, and in which rack a server is --
 * each line on the screen being a rack, and each number pair being a server.
 */



var fs        = require('fs');
var uuid      = require('node-uuid');
var Allocator = require('../lib/allocator');



var BAR_RANGE = 5; // the range of each histogram bar
var SERVER_SPREAD = 'min-ram';
var SERVER_RAM  = 131039; // in MiB
var SERVER_DISK = 3283; // in GiB
var SERVERS_PER_RACK = 12;
var NUM_RACKS = 24;
var NUM_SERVERS = SERVERS_PER_RACK * NUM_RACKS;
var MiB = 1024 * 1024;



var ALLOC_CHAIN = [
	'pipe', 'hard-filter-setup',
	        'hard-filter-running',
	        'hard-filter-invalid-servers',
	        'hard-filter-volumes-from',
	        'calculate-ticketed-vms',
	        'calculate-locality',
	        'hard-filter-reserved',
	        'hard-filter-headnode',
//	        'hard-filter-vm-count',
	        'hard-filter-vlans',
	        'hard-filter-platform-versions',
	        'hard-filter-traits',
	        'hard-filter-sick-servers',
	        'override-overprovisioning',
	        'calculate-server-unreserved',
	        'hard-filter-overprovision-ratios',
	        'hard-filter-min-ram',
	        'hard-filter-min-cpu',
//	        'hard-filter-min-disk',
	       ['or', 'hard-filter-reservoir',
	              'identity'],
	       ['or', 'hard-filter-large-servers',
	              'identity'],
	       'soft-filter-locality-hints',
	       'sort-min-ram',
	       'sort-min-owner',
	       'sort-random',
	       'pick-weighted-random'];

var ALLOC_DEFAULTS = {
	server_spread: SERVER_SPREAD,
	filter_headnode: true,
	filter_min_disk: false,
	filter_min_resources: true,
	filter_large_servers: true,
	filter_vm_limit: null
};



/*
 * Loads relevant information about each zone from vmapi dump. An array is
 * returned where each object represents a zone.
 */

function loadZoneData(filename) {
	var fileData = fs.readFileSync(filename, 'ascii');
	var vms = JSON.parse(fileData);

	vms = vms.filter(function (vm) {
		if (vm.ram > SERVER_RAM || !vm.create_timestamp) {
			return (false);
		}

		if (!vm.tags) {
			return (true);
		}

		return (Object.keys(vm.tags).length === 0);
	});

	return (vms);
}



/*
 * Retuns a list of zones where they're sorted by date of creation.
 */

function orderZonesByCreation(zoneHistory) {
	var sortedZones = zoneHistory.sort(function (a, b) {
		if (a.create_timestamp > b.create_timestamp)
			return (1);
		return (-1);
	});

	return (sortedZones);
}



/*
 * Returns a list of zones where they're sorted by date of destruction.
 */

function orderZonesByDestruction(zoneHistory) {
	var destroyedZones = zoneHistory.filter(function (zone) {
		return (zone.destroyed);
	});

	var sortedZones = destroyedZones.sort(function (a, b) {
		if (a.destroyed > b.destroyed)
			return (1);
		return (-1);
	});

	return (sortedZones);
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
		if (createdList[0].create_timestamp <=
			destroyedList[0].destroyed) {

			activity = ['create', createdList.shift()];
		} else {
			activity = ['destroy', destroyedList.shift()];
		}

		activities.push(activity);
	}

	if (createdList.length > 0) {
		remainder = createdList.map(function (zone) {
			return (['create', zone]);
		});
	} else if (destroyedList.length > 0) {
		remainder = destroyedList.map(function (zone) {
			return (['destroy', zone]);
		});
	}

	activities = activities.concat(remainder);

	return (activities);
}



/*
 * Returns a list of events (zone creation and destruction) to zones sorted by
 * date, after the zone data is loaded from a data file.
 */

function createActivityList(filename) {
	var zoneHistory   = loadZoneData(filename);
	var createdList   = orderZonesByCreation(zoneHistory);
	var destroyedList = orderZonesByDestruction(zoneHistory);
	var activityList  = activitiesByDate(createdList, destroyedList);

	return (activityList);
}



/*
 * Create a simplified version of what CNAPI returns, which can be passed to
 * DAPI.
 */

function createServer(ram, disk, rackId) {
	var serverUuid = uuid();
	var ramBytes   = ram * MiB;
    var availBytes = Math.floor(ramBytes * 0.85);

	var server = {
		uuid: serverUuid,
		sysinfo: {
			'Live Image': '20141010T203452Z',
			'VM Capable': true,
			'CPU Virtualization': 'none',
			'CPU Total Cores': 32,
			'MiB of Memory': '' + ram,
			'Zpool Size in GiB': disk,
			'Network Interfaces': {
				'igb0': {
					'Link Status': 'up',
					'NIC Names': ['external', 'internal']
				}
			}
		},
		reserved: false,
		headnode: false,
		setup: true,
		status: 'running',
		memory_total_bytes: ramBytes,
		memory_available_bytes: availBytes, // unused in practice
		reservation_ratio: 0.13,
		rack_identifier: rackId,
		disk_pool_size_bytes: disk,
		disk_kvm_zvol_volsize_bytes: 0,
		disk_kvm_quota_bytes: 0,  // unused in practice
		disk_zone_quota_bytes: 0,
		disk_installed_images_used_bytes: 0,
		traits: {},
		vms: {}
	};

	return (server);
}



/*
 * Create a VM object which can be passed to DAPI as part of the server object.
 */

function createVm(vmUuid, ram, cpu, disk, type, ownerUuid) {
	var vm = {
		uuid: vmUuid,
		owner_uuid: ownerUuid,
		cpu_cap: cpu,
		quota: disk,
		brand: type,
		max_physical_memory: ram,
		last_modified: new Date().toISOString(),
		zone_state: 'running',
		state: 'running'
	};

	return (vm);
}



/*
 * Create a provisioning ticket, to emulate concurrent calls to DAPI.
 */

function createTicket(vmUuid, ram, cpu, disk, type, ownerUuid) {
	var ticket = {
		id: vmUuid,
		scope: 'vm',
		action: 'provision',

		extra: {
			owner_uuid: ownerUuid,
			max_physical_memory: ram,
			cpu_cap: cpu,
			quota: Math.ceil(disk / 1024),
			brand: type
		}
	};

	return (ticket);
}


/*
 * Adds a VM object to a server object for a given server UUID.
 */

function addVmToServer(vm, servers, serverUuid) {
	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];

		if (server.uuid === serverUuid) {
			server.vms[vm.uuid] = vm;
			var size = vm.quota * MiB;

			if (vm.brand === 'kvm') {
				server.disk_kvm_zvol_volsize_bytes += size;
			} else {
				server.disk_zone_quota_bytes += size;
			}

			return;
		}
	}
}



/*
 * Removes a VM object from the servers.
 */

function removeVmFromServers(vm, servers) {
	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];

		if (server.vms[vm.uuid]) {
			delete server.vms[vm.uuid];
			var size = vm.quota * MiB;

			if (vm.brand === 'kvm') {
				server.disk_kvm_zvol_volsize_bytes -= size;
			} else {
				server.disk_zone_quota_bytes -= size;
			}

			return;
		}
	}
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

	return (servers);
}



/*
 * Determine how many VMs there are on a server, and what percentage of RAM
 * they're using of that server.
 */

function calculateServerUtilization(server) {
	var vms = server.vms;
	var numVms = Object.keys(vms).length;

	var ramUsed = Object.keys(vms).reduce(function (sum, vmUuid) {
		return (sum + vms[vmUuid].max_physical_memory);
	}, 0);

	var ratioFull = ramUsed / (server.memory_total_bytes / MiB);
	var percentFull = Math.floor(100 * ratioFull);

	return ([numVms, percentFull]);
}


/*
 * Instantiate one copy of DAPI's allocator and return it.
 */

function createAllocator() {
	var log = {
		info:  function () {},
		warn:  function () {},
		debug: function () {},
		error: function () {},
		trace: function () {}
	};

	var allocator = new Allocator(log, ALLOC_CHAIN, ALLOC_DEFAULTS);

	return (allocator);
}



/*
 * Display a pair of numbers for a server. The first number is how many VMs
 * there are on a server. The second number is what percentage of RAM on the
 * server is taken up by VMs. Some colour is included.
 */

function renderServer(server, highlight) {
	var res = calculateServerUtilization(server);
	var numVms = res[0];
	var percentFull = res[1];

	var padding = '  ';
	if (('' + numVms).length == 2) {
		padding = ' ';
	}

	var str;
	if (highlight) {
		str = '\033[31m' + numVms + padding + percentFull;
	} else {
		str = '\033[34m' + numVms + '\033[32m' + padding + percentFull;
	}

	return (str);
}



/*
 * Display the RAM each VM is taking on each server.
 */

function displayVmLayout(servers) {
	var rows = [];

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		var vmNames = Object.keys(server.vms);

		var vms = vmNames.map(function (vmName) {
			return (server.vms[vmName]);
		});

		var vmSizes = vms.map(function (vm) {
			return (vm.max_physical_memory);
		});

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
 * Displays a histogram of what percentage of servers have a given percent
 * RAM utilization.
 */

function renderHistogram(servers) {
	var stdout = process.stdout;

	var utilizations = servers.map(function (server) {
		return (calculateServerUtilization(server)[1]);
	});

	for (var i = 0; i !== 100; i += BAR_RANGE) {
		var numMembers = utilizations.filter(function (utilization) {
			return (utilization >= i &&
			        utilization < (i + BAR_RANGE));
		}).length;

		var barLength = Math.floor(numMembers / servers.length * 70);

		stdout.write(i + '\t');
		for (var chr = 0; chr !== barLength; chr++) {
			stdout.write('@');
		}
		stdout.write('\n');
	}
}



/*
 * Displays all servers in their racks, and how many VMs are on each server.
 */

function renderLayout(servers, newestServerUuid) {
	var rows = [];

	for (var i = 0; i !== servers.length; i++) {
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
}



/*
 * Displays which VMs have been added and removed, a menu, and whichever graph
 * is currently selected for display of servers' state.
 */

var graphMode = 0;
function display(servers, newestServerUuid, vmUuid, removedVmUuids) {
	console.log('\033[2J'); // clear screen


	if (removedVmUuids) {
		for (var i = 0; i !== removedVmUuids.length; i++)
			console.log('Remove VM', removedVmUuids[i]);
	}

	if (newestServerUuid && vmUuid) {
		console.log('Add VM', vmUuid, 'to server', newestServerUuid);
		console.log();
	}

	if (graphMode === 0) {
		renderLayout(servers, newestServerUuid);
	} else {
		renderHistogram(servers);
	}

	console.log('\033[m'); // reset to normal colours
	console.log('(q)uit, (n)ext, (d)etails, (c)sv dump, (g)raph mode,\n' +
	            'iterations: 10^(1) 10^(2) 10^(3) 10^(4) 10^(5)');
}



/*
 * Dump to stdout a CSV of number of VMs and percentage used per server.
 */

var csvIndex = 0;
function dumpVmCsv(servers) {
	var filename = 'sim' + csvIndex + '.csv';
	csvIndex += 1;

	var file = fs.openSync(filename, 'w');

	servers.forEach(function (server) {
		var utilization = calculateServerUtilization(server);
		fs.writeSync(file, utilization.join(',') + '\n');
	});

	fs.closeSync(file);

	console.log('CSV written to', filename);
}



/*
 * Adds or removes a VM from a server, depending upon what the activity list
 * says. Adding involves calling out to DAPI so it can determine which server
 * the next VM should go onto.
 */

function allocate(allocator, activityList, servers, tickets, concurrency) {
	var removedVmUuids = [];
	var activity = activityList.shift();

	while (activity && activity[0] === 'destroy') {
		var vm = activity[1];
		removeVmFromServers(vm, servers);
		removedVmUuids.push(vm.uuid);

		activity = activityList.shift();
	}

	if (!activity)
		return (process.exit());

	// otherwise we're creating
	var vmUuid = activity[1].uuid;
	var ram	   = +activity[1].ram;
	var cpu	   = +activity[1].cpu_cap || 100;
	var disk   = +activity[1].quota;
	var brand  = activity[1].brand;
	var ownerUuid = activity[1].owner_uuid;

	var desc = {
		ram: ram,
		quota: Math.ceil(disk / 1024),
		brand: brand,
		owner_uuid: ownerUuid
	};

	var pkg = {
		max_physical_memory: ram,
		cpu_cap: cpu,
		quota: disk
	};

	while (tickets.length > concurrency) {
		tickets.shift();
	}

	var results = allocator.allocate(servers, desc, {}, pkg, [], true);
	var server  = results[0];
	var steps   = results[1];

	if (!server) {
		console.dir(steps);
		// console.dir(servers);
		// console.dir(tickets);
		console.dir(desc);
		process.exit(1);
	}

	var createdVm = createVm(vmUuid, ram, cpu, disk, brand, ownerUuid);
	addVmToServer(createdVm, servers, server.uuid);

	var ticket = createTicket(vmUuid, ram, cpu, disk, brand, ownerUuid);
	tickets.push(ticket);

	display(servers, server.uuid, createdVm.uuid, removedVmUuids);

	return (null);
}



/*
 * Figure out what to do, and do it, based upon the given keypress.
 */

function doInputCommand(key, servers, allocateVm) {
	// ctrl-c
	if (key === 'q' || key === '\u0003') {
		process.exit();
	}

	if (key === 'n' || key === ' ') {
		allocateVm(servers);
	}

	if (key === 'd') {
		displayVmLayout(servers);
	}

	if (key === 'c') {
		dumpVmCsv(servers);
	}

	if (key === 'g') {
		if (graphMode === 0) {
			graphMode = 1;
		} else {
			graphMode = 0;
		}

		display(servers);
	}

	if (['1', '2', '3', '4', '5'].indexOf(key) !== -1) {
		var iterations = Math.pow(10, key);

		for (var i = 0; i !== iterations; i++) {
			allocateVm(servers);
		}
	}
}



/*
 * Wait for a key to be pressed, then perform the appropriate action as a
 * result.
 */

function waitOnInput(servers, allocateVm) {
	var stdin = process.stdin;
	stdin.setRawMode(true);
	stdin.setEncoding('ascii');
	stdin.resume();

	stdin.on('data', function (key) {
		stdin.pause();

		doInputCommand(key, servers, allocateVm);

		stdin.resume();
	});
}



function main() {
	if (process.argv.length !== 4) {
		var err = console.error;
		err('Usage: node ' + __filename + ' concurrency dump');
		err('  concurrency is the number of concurrent calls');
		err('  dump is the file containing JSON dump from vmapi');
		process.exit(1);
	}

	var concurrency = process.argv[2];
	var dumpPath    = process.argv[3];

	var activityList = createActivityList(dumpPath);
	var servers = createServers(NUM_SERVERS, SERVER_RAM, SERVER_DISK);
	var tickets = [];
	var allocator = createAllocator();

	function allocateVm(_servers) {
		allocate(allocator, activityList, _servers, tickets,
		         concurrency);
	}

	allocateVm(servers);
	waitOnInput(servers, allocateVm);
}



main();
