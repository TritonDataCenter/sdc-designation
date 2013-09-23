/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 *
 * The three resources important to allocation on a server -- from DAPI's
 * perspective -- is CPU, RAM and disk. This script calculates the aggregate
 * CPU, RAM and disk free and total in a datacenter; in other words, the sum of
 * all free resources across all servers. This is divided into those servers
 * which are available for DAPI's use, and reserved servers which DAPI ignores.
 *
 * Usage:
 *
 * sdc-cnapi --no-headers /servers?extras=vms,disk,memory,sysinfo > cnapi.json
 * node capacity.js < cnapi.json
 */

var fs = require('fs');



var MiB = 1024 * 1024;
var GiB = 1024 * MiB;
var CPU_OVERPROVISION = 4;
var KVM_QUOTA = 10 * GiB;



function calculateCapacity(servers) {
    var dc = {
        unreservedFree:  { cpu: 0, ram: 0, disk: 0 },
        unreservedTotal: { cpu: 0, ram: 0, disk: 0 },
        reservedFree:    { cpu: 0, ram: 0, disk: 0 },
        reservedTotal:   { cpu: 0, ram: 0, disk: 0 }
    };

    servers.forEach(function (server) {
        if (server.headnode)
            return;

        var free, total;
        if (server.reserved) {
            free  = dc.reservedFree;
            total = dc.reservedTotal;
        } else {
            free  = dc.unreservedFree;
            total = dc.unreservedTotal;
        }

        var vms  = server.vms;
        var cpu  = server.sysinfo['CPU Total Cores'] * 100;
        var ram  = server.memory_total_bytes * (1 - server.reservation_ratio);
        var disk = server.disk_pool_size_bytes;

        total.cpu  += cpu;
        total.ram  += ram;
        total.disk += disk;

        var vmNames = Object.keys(vms);
        vmNames.forEach(function (name) {
            var vm = vms[name];

            if (vm.cpu_cap) {
                cpu -= vm.cpu_cap / CPU_OVERPROVISION;
            } else {
                cpu = 0;
            }

            ram -= vm.max_physical_memory * MiB;

            if (vm.brand === 'kvm')
                disk -= KVM_QUOTA;
        });

        disk -= server.disk_installed_images_used_bytes +
                server.disk_zone_quota_bytes +
                server.disk_kvm_zvol_volsize_bytes;

        free.cpu  += Math.floor(cpu);
        free.ram  += Math.floor(ram);
        free.disk += Math.floor(disk);
    });

    return dc;
}



function printCap(title, free, total) {
    console.log(title + ':');

    console.log('CPU cap:\t%d (%d%) free,\t%d (%d%) used,\t%d total',
                Math.floor(free.cpu),
                Math.floor(free.cpu / total.cpu * 100),
                Math.ceil(total.cpu - free.cpu),
                Math.ceil((1 - free.cpu / total.cpu) * 100),
                Math.floor(total.cpu));

    console.log('RAM (MiB):\t%d (%d%) free,\t%d (%d%) used,\t%d total',
                Math.floor(free.ram / MiB),
                Math.floor(free.ram / total.ram * 100),
                Math.ceil((total.ram - free.ram) / MiB),
                Math.ceil((1 - free.ram / total.ram) * 100),
                Math.floor(total.ram / MiB));

    console.log('Disk (GiB):\t%d (%d%) free,\t%d (%d%) used,\t%d total',
                Math.floor(free.disk / GiB),
                Math.floor(free.disk / total.disk * 100),
                Math.ceil((total.disk - free.disk) / GiB),
                Math.ceil((1 - free.disk / total.disk) * 100),
                Math.floor(total.disk / GiB));
}



function main() {
    var json = fs.readFileSync('/dev/stdin');
    var servers = JSON.parse(json);
    var dc = calculateCapacity(servers);

    printCap('Unreserved capacity', dc.unreservedFree, dc.unreservedTotal);
    console.log();
    printCap('Reserved capacity', dc.reservedFree, dc.reservedTotal);
}



main();
