/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * Computes what the unreserved CPU, RAM and disk on each server is. Several
 * plugins depend on this one being run first in order to provide them the
 * needed summaries.
 *
 * This makes the crucial assumption that all VMs on a server have the same
 * overprovision ratios (see the hard-filter-overprovision-ratios.js top comment
 * for why this assumption should be true).
 *
 * We assume here that a VM missing a cpu_cap or quota (these are optional)
 * completely fill up a server since we cannot guarantee they won't use all the
 * space. Obviously, you don't want too many of these floating around.
 *
 * Be aware that by default, and historically, servers were treated as if they
 * had an overprovision_ratios of { ram: 1.0 } -- this means that RAM isn't
 * overprovisioned, and DAPI ignores whether other resources are being
 * overprovisioned.
 */



var DEFAULT_SERVER_OVERPROVISIONING = { ram: 1.0 };



function calculateServerUnreserved(log, state, servers, vmDetails) {
    servers.forEach(function (server) {
        if (!server.sysinfo) {
            server.unreserved_cpu  = 0;
            server.unreserved_ram  = 0;
            server.unreserved_disk = 0;
            return;
        }

        // also convert to MiB and cpu_cap units
        server.unreserved_cpu  = server.sysinfo['CPU Total Cores'] * 100;
        server.unreserved_disk = server.sysinfo['Zpool Size in GiB'] * 1024;
        server.unreserved_ram  = (server.memory_total_bytes / 1024 / 1024) *
                                 (1 - server.reservation_ratio);

        // a server that has no overprovision ratios is treated like a server
        // that never overprovisions RAM
        server.overprovision_ratios = server.overprovision_ratios ||
                                      DEFAULT_SERVER_OVERPROVISIONING;

        var vms = server.vms;
        if (!vms)
            return;

        var overprovisionCpu  = server.overprovision_ratios.cpu;
        var overprovisionRam  = server.overprovision_ratios.ram;
        var overprovisionDisk = server.overprovision_ratios.disk;

        var vmUuids = Object.keys(vms);

        for (var j = 0; j != vmUuids.length; j++) {
            var vm = vms[vmUuids[j]];

            var cpu = vm.cpu_cap;
            if (cpu) {
                if (overprovisionCpu)
                    cpu /= overprovisionCpu;

                server.unreserved_cpu -= cpu;
            } else {
                server.unreserved_cpu = 0;
            }

            var disk = vm.quota;
            if (disk) {
                disk *= 1024; // convert to MiB

                if (overprovisionDisk)
                    disk /= overprovisionDisk;

                server.unreserved_disk -= disk;
            } else {
                server.unreserved_disk = 0;
            }


            var ram = vm.max_physical_memory;
            if (overprovisionRam)
                ram /= overprovisionRam;

            server.unreserved_ram  -= ram;
        }

        server.unreserved_cpu  = Math.floor(server.unreserved_cpu);
        server.unreserved_ram  = Math.floor(server.unreserved_ram);
        server.unreserved_disk = Math.floor(server.unreserved_disk);
    });

    return servers;
}



module.exports = {
    name: 'Calculate unreserved resources on each server',
    run: calculateServerUnreserved
};
