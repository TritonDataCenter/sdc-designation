/*
 * Copyright (c) 2014, Joyent, Inc. All rights reserved.
 *
 * Appends VMs that DAPI allocated the past ten minutes to the list of VMs
 * on a server if those VMs have not yet appeared in the CNAPI input being fed
 * to DAPI.
 *
 * The purpose of this plugin is to mitigate collisions caused by concurrent
 * requests, e.g. five 8GiB VMs are requested at the same time, thus are likely
 * to be allocated to the same server. One means of doing this is locking, but
 * that requires communication with external services and reduces concurrency.
 * Instead we take a good-enough approach of remembering which VMs were
 * allocated to which servers, and adding them to the VMs list on those servers
 * if they haven't reached CNAPI's awareness yet.
 */

var MAX_AGE = 10 * 60 * 1000;   // ten min in ms
var STATE_KEY = 'recent_vms';   // name for saving recent info to state hash

var MiB = 1024 * 1024;
var GiB = MiB * 1024;

/*
 * Check if there have been any recent VM allocations. If there have been, but
 * those VMs have no yet appeared in input from CNAPI, then add those VMs here
 * for further processing. Effectively, this makes it look to DAPI like those
 * allocations are successful for the next ten minutes -- by which time CNAPI
 * hopefully is aware of the new VMs.
 */
function
addRecentVms(log, state, servers, constraints)
{
	var reasons = constraints.capacity ? null : {};

	var recentVms = updateRecentVms(state);
	servers = addVmsToServers(servers, recentVms, reasons);

	return ([servers, reasons]);
}

/*
 * Removes expired VMs from state (i.e. timestamp is older than ten
 * minutes). It's assumed by this point the VM will long since have come to
 * the awareness of CNAPI.
 */
function
updateRecentVms(state)
{
	var cutoffTimestamp = +new Date() - MAX_AGE;
	var recentlySeen = state[STATE_KEY] || [];

	recentlySeen = recentlySeen.filter(function (vm) {
		return (vm.created_at > cutoffTimestamp);
	});

	state[STATE_KEY] = recentlySeen;

	return (recentlySeen);
}

/*
 * Add any recently-allocated VMs to the server they were allocated to if a
 * VM hasn't yet appeared in CNAPI's output. Adjust disk usage on the server
 * to appear as if disk is also being used by each VM.
 *
 * Note that 'reasons' arg mutates.
 */
function
addVmsToServers(servers, recentVms, reasons)
{
	var serverLookup = {};

	recentVms.forEach(function (vm) {
		if (serverLookup[vm.server_uuid]) {
			serverLookup[vm.server_uuid].push(vm);
		} else {
			serverLookup[vm.server_uuid] = [vm];
		}
	});

	for (var i = 0; i !== servers.length; i++) {
		var server = servers[i];
		var addVms = serverLookup[server.uuid];

		if (!addVms)
			continue;

		var serverVms = server.vms;

		addVms.forEach(function (vm) {
			if (serverVms[vm.uuid])
				return;

			serverVms[vm.uuid] = vm;

			if (vm.image_size) {
				server.disk_kvm_zvol_volsize_bytes +=
				    vm.image_size;
			}

			if (vm.brand === 'kvm') {
				server.disk_kvm_zvol_volsize_bytes +=
				    vm.quota * GiB;
			} else {
				server.disk_zone_quota_bytes += vm.quota * GiB;
			}

			if (!reasons)
				return;

			var msg = 'Adding VM ' + vm.uuid + '.';
			var oldMsg = reasons[server.uuid];
			if (oldMsg) {
				reasons[server.uuid] = oldMsg + ' ' + msg;
			} else {
				reasons[server.uuid] = msg;
			}
		});
	}

	return (servers);
}

/*
 * Adds a VM and timestamp to state; used for future requests.
 */
function
addNewVm(log, state, server, servers, constraints)
{
	var vmDetails = constraints.vm;
	var pkg = constraints.pkg;
	var img = constraints.img;

	// override_recent_vms is here to aid testing
	if (!server || vmDetails.override_recent_vms)
		return;

	var brand = img.type === 'zvol' ? 'kvm' : 'smartos';

	var vm = {
		uuid: vmDetails.vm_uuid,
		owner_uuid: vmDetails.owner_uuid,
		max_physical_memory: pkg.max_physical_memory,
		cpu_cap: pkg.cpu_cap,
		quota: pkg.quota / 1024, // convert to GiB
		brand: brand,
		state: 'running',

		server_uuid: server.uuid,
		created_at: +new Date(),
		last_modified: new Date().toISOString()
	};

	if (brand === 'kvm') {
		vm.max_physical_memory += 1024;

		if (img.image_size)
			vm.image_size = img.image_size * MiB;
	}

	state[STATE_KEY].push(vm);
}

module.exports = {
	name: 'Add VMs which have been allocated to recently',
	run: addRecentVms,
	post: addNewVm,
	affectsCapacity: false
};
