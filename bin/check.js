/*
 * Gives warnings and errors about missing caps and quotas, and determines
 * which servers can fulfil a request. The results are a rough guide, since
 * this does not take traits or networks into account.
 *
 * In order to use this script to check the rough capacity for a package with
 * 8GiB RAM, 240 GiB disk, and 1200 cpu cap:
 *
 * sdc-cnapi --no-headers /servers?extras=vms,disk,memory,sysinfo > cnapi.json
 * node check.js 8192 240 1200 < cnapi.json
 */

var mod_fs = require('fs');
var mod_path = require('path');

if (process.argv.length !== 5) {
	var basename = mod_path.basename(process.argv[1]);
	console.error('Usage: ' + basename + ' <ram MiB> <disk GiB> <cpu cap>');
	process.exit(1);
}

var lowRam  = process.argv[2] * 1024 * 1024;
var lowDisk = process.argv[3] * 1024 * 1024 * 1024;
var lowCpu  = process.argv[4];

var json = mod_fs.readFileSync('/dev/stdin');
var servers = JSON.parse(json);

servers.forEach(function (server) {
	var vms;
	var cpu;
	var ram;
	var disk;
	var vmNames;
	var msg;

	if (server.headnode) {
		console.log('Note: CN', server.uuid,
		    'is a headnode. Skipping...\n');
		return;
	}

	if (!server.setup) {
		console.log('Note: CN', server.uuid,
		    'is unsetup. Skipping...\n');
		return;
	}

	vms = server.vms;
	cpu = server.sysinfo['CPU Total Cores'] * 100;
	ram = server.memory_total_bytes * (1 - server.reservation_ratio);

	disk = server.disk_pool_size_bytes -
	    server.disk_installed_images_used_bytes -
	    server.disk_zone_quota_bytes -
	    server.disk_kvm_zvol_volsize_bytes;

	vmNames = Object.keys(vms);
	vmNames.forEach(function (name) {
		var vm = vms[name];

		if (vm.brand === 'kvm')
			disk -= 10 * 1024 * 1024 * 1024;

		if (!vm.quota)
			console.log('Warning: VM', name, 'has no quota');

		if (vm.state === 'failed')
			return;

		ram -= vm.max_physical_memory * 1024 * 1024;

		if (vm.cpu_cap) {
			cpu -= vm.cpu_cap / 4;
		} else {
			console.log('Error: VM', name, 'has no cpu_cap');
			cpu = 0;
		}
	});

	ram = Math.floor(ram);
	disk = Math.floor(disk);
	cpu = Math.floor(cpu);

	msg = 'Note: CN ' + server.uuid;

	if (ram < lowRam || isNaN(ram))
		console.log(msg, 'has low RAM: ', ram);

	if (disk < lowDisk || isNaN(disk))
		console.log(msg, 'has low disk:', disk);

	/*
	 * XXX CPU overprovisioning is no longer fixed at 4x.
	 */
	if (cpu < lowCpu / 4 || isNaN(cpu))
		console.log(msg, 'has low cpu: ', cpu);

	msg = '--> CN ' + server.uuid;

	/*
	 * XXX This needs to account for storage use.
	 */
	if (ram >= lowRam && cpu >= lowCpu / 4) {
		if (server.reserved) {
			console.log(msg, 'has enough, but reserved');
		} else if (server.status !== 'running') {
			console.log(msg, 'has enough, but has status',
			    server.status);
		} else if (server.traits &&
		    Object.keys(server.traits).length > 0) {
			console.log(msg, 'has enough, but traits:',
			    server.traits);
		} else {
			console.log(msg, 'has enough');
		}
	} else {
		console.log(msg, 'does not have enough');
	}

	console.log('');
});
