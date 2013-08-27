/*
 * Copyright (c) 2013, Joyent, Inc. All rights reserved.
 */

var assert = require('assert');
var common = require('./common');



/* BEGIN JSSTYLED */
var servers = [ {
    'datacenter': 'us-beta-4',
    'sysinfo': {
      'Live Image': '20130729T215806Z',
      'System Type': 'SunOS',
      'Boot Time': '1375216140',
      'Datacenter Name': 'us-beta-4',
      'SDC Version': '7.0',
      'Manufacturer': 'Supermicro',
      'Product': 'X9DRD-7LN4F',
      'Serial Number': '0123456789',
      'Setup': 'true',
      'VM Capable': true,
      'CPU Type': 'Intel(R) Xeon(R) CPU E5-2670 0 @ 2.60GHz',
      'CPU Virtualization': 'vmx',
      'CPU Physical Cores': 4,
      'UUID': '00000000-0000-0000-0000-00259094373c',
      'Hostname': '00-25-90-94-37-3c',
      'CPU Total Cores': 64,
      'MiB of Memory': '131043',
      'Zpool': 'zones',
      'Zpool Disks': 'c0t5000A7203007B1A9d0,c10t5000CCA0160D6E5Dd0,c11t5000CCA022019BEDd0,c12t5000CCA022008921d0,c13t5000CCA01610CA05d0,c1t5000CCA02203FAFDd0,c2t5000CCA016148695d0,c3t5000CCA022016BADd0,c4t5000CCA02201A4C5d0,c5t5000CCA0220199C1d0,c6t5000CCA02200C8C1d0,c7t5000CCA02203CA49d0,c8t5000CCA016148709d0,c9t5000CCA0160EB825d0',
      'Zpool Profile': 'mirror',
      'Zpool Creation': 1364822661,
      'Zpool Size in GiB': 3283,
      'Disks': {
        'c0t5000A7203007B1A9d0': {
          'Size in GB': 100
        },
        'c10t5000CCA0160D6E5Dd0': {
          'Size in GB': 600
        },
        'c11t5000CCA022019BEDd0': {
          'Size in GB': 600
        },
        'c12t5000CCA022008921d0': {
          'Size in GB': 600
        },
        'c13t5000CCA01610CA05d0': {
          'Size in GB': 600
        },
        'c1t5000CCA02203FAFDd0': {
          'Size in GB': 600
        },
        'c2t5000CCA016148695d0': {
          'Size in GB': 600
        },
        'c3t5000CCA022016BADd0': {
          'Size in GB': 600
        },
        'c4t5000CCA02201A4C5d0': {
          'Size in GB': 600
        },
        'c5t5000CCA0220199C1d0': {
          'Size in GB': 600
        },
        'c6t5000CCA02200C8C1d0': {
          'Size in GB': 600
        },
        'c7t5000CCA02203CA49d0': {
          'Size in GB': 600
        },
        'c8t5000CCA016148709d0': {
          'Size in GB': 600
        },
        'c9t5000CCA0160EB825d0': {
          'Size in GB': 600
        }
      },
      'Boot Parameters': {
        'hostname': '00-25-90-94-37-3c',
        'rabbitmq': 'guest:guest:10.3.1.23:5672',
        'rabbitmq_dns': 'guest:guest:rabbitmq.us-beta-4.joyent.us:5672',
        'admin_nic': '00:25:90:94:37:3c',
        'external_nic': '90:e2:ba:2a:bb:18',
        'console': 'text',
        'text_mode': '115200,8,n,1,-'
      },

      'Network Interfaces': {
        'igb0': {
          'MAC Address': '00:25:90:94:37:3c',
          'ip4addr': '10.3.1.37',
          'Link Status': 'up',
          'NIC Names': [
            'admin'
          ]
        },
        'igb1': {
          'MAC Address': '00:25:90:94:37:3d',
          'ip4addr': '',
          'Link Status': 'down',
          'NIC Names': []
        },
        'igb2': {
          'MAC Address': '00:25:90:94:37:3e',
          'ip4addr': '',
          'Link Status': 'down',
          'NIC Names': []
        },
        'igb3': {
          'MAC Address': '00:25:90:94:37:3f',
          'ip4addr': '',
          'Link Status': 'down',
          'NIC Names': []
        },
        'ixgbe0': {
          'MAC Address': '90:e2:ba:2a:bb:18',
          'ip4addr': '',
          'Link Status': 'up',
          'NIC Names': [
            'external'
          ]
        },
        'ixgbe1': {
          'MAC Address': '90:e2:ba:2a:bb:19',
          'ip4addr': '',
          'Link Status': 'down',
          'NIC Names': []
        }
      },
      'Virtual Network Interfaces': {},
      'Link Aggregations': {}
    },
    'ram': 131043,
    'current_platform': '20130729T215806Z',
    'headnode': false,
    'boot_platform': '20130729T215806Z',
    'overprovision_ratio': 1,
    'reservation_ratio': 0.15,
    'traits': {},
    'rack_identifier': '',
    'comments': '',
    'uuid': '00000000-0000-0000-0000-00259094373c',
    'reserved': false,
    'boot_params': {
      'rabbitmq': 'guest:guest:rabbitmq.us-beta-4.joyent.us:5672'
    },
    'default_console': 'vga',
    'serial': 'ttyb',
    'setup': true,
    'setting_up': false,
    'last_boot': '2013-07-30T20:29:00.000Z',
    'created': '2013-04-01T13:24:21.000Z',
    'transitional_status': '',
    'hostname': '00-25-90-94-37-3c',
    'last_heartbeat': '2013-08-23T14:58:22.084Z',
    'status': 'running',
    'overprovision_ratios': {
      'cpu': 4,
      'ram': 1,
      'disk': 1
    },
    'memory_available_bytes': 125551230976,
    'memory_arc_bytes': 1945323800,
    'memory_total_bytes': 137399590912,
    'disk_kvm_zvol_used_bytes': 44023414784,
    'disk_kvm_zvol_volsize_bytes': 44023414784,
    'disk_kvm_quota_bytes': 10737418240,
    'disk_zone_quota_bytes': 134217728000,
    'disk_cores_quota_bytes': 536870912000,
    'disk_installed_images_used_bytes': 5905771008,
    'disk_pool_size_bytes': 3582002724864,
    'vms': {
      '736ddef6-8854-4dd5-82a0-2d184bd90cd4': {
        'uuid': '736ddef6-8854-4dd5-82a0-2d184bd90cd4',
        'owner_uuid': '9dce1460-0c4c-4417-ab8b-25ca478c5a78',
        'quota': 25,
        'max_physical_memory': 128,
        'zone_state': 'running',
        'state': 'running',
        'brand': 'joyent',
        'cpu_cap': 100,
        'last_modified': '2013-06-21T17:38:51.000Z'
      },
      'c3ae2426-9ed2-4322-a780-9ef032359d9a': {
        'uuid': 'c3ae2426-9ed2-4322-a780-9ef032359d9a',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'quota': 25,
        'max_physical_memory': 1024,
        'zone_state': 'running',
        'state': 'running',
        'brand': 'joyent',
        'cpu_cap': 300,
        'last_modified': '2013-06-06T22:22:31.000Z'
      },
      '9dc466a4-b918-4a6f-9226-1e49d0017a79': {
        'uuid': '9dc466a4-b918-4a6f-9226-1e49d0017a79',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'quota': 25,
        'max_physical_memory': 128,
        'zone_state': 'running',
        'state': 'running',
        'brand': 'joyent',
        'cpu_cap': 100,
        'last_modified': '2013-07-09T20:22:25.000Z'
      },
      '01d16d02-9713-4bfa-a572-b68ef9eed942': {
        'uuid': '01d16d02-9713-4bfa-a572-b68ef9eed942',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'quota': 10,
        'max_physical_memory': 1280,
        'zone_state': 'running',
        'state': 'running',
        'brand': 'kvm',
        'cpu_cap': 300,
        'last_modified': '2013-07-30T20:30:52.000Z'
      },
      '6295c165-e718-47be-b4d1-af78ee54bbb9': {
        'uuid': '6295c165-e718-47be-b4d1-af78ee54bbb9',
        'owner_uuid': '9dce1460-0c4c-4417-ab8b-25ca478c5a78',
        'quota': 25,
        'max_physical_memory': 8192,
        'zone_state': 'running',
        'state': 'running',
        'brand': 'joyent-minimal',
        'cpu_cap': 400,
        'last_modified': '2013-08-20T00:16:45.000Z'
      },
      'edaaee38-6e2a-4f0c-b7af-655959b60c36': {
        'uuid': 'edaaee38-6e2a-4f0c-b7af-655959b60c36',
        'owner_uuid': '17d6dd35-291a-407a-884c-c4c1bff4476b',
        'quota': 25,
        'max_physical_memory': 128,
        'zone_state': 'installed',
        'state': 'failed',
        'brand': 'joyent',
        'cpu_cap': 100,
        'last_modified': '2013-07-08T12:07:31.000Z'
      }
    }
  },
  {
    'datacenter': 'us-beta-4',
    'sysinfo': {
      'Live Image': '20130111T180733Z',
      'System Type': 'SunOS',
      'Manufacturer': 'Supermicro',
      'Product': 'X9DRD-7LN4F',
      'Serial Number': '0123456789',
      'UUID': '00000000-0000-0000-0000-0025909437d4',
      'Hostname': '00-25-90-94-37-d4',
      'VM Capable': true,
      'CPU Type': 'Intel(R) Xeon(R) CPU E5-2670 0 @ 2.60GHz',
      'CPU Virtualization': 'vmx',
      'CPU Physical Cores': 4,
      'CPU Total Cores': 64,
      'MiB of Memory': '131043',
      'Disks': {
        'c0t5000A7203007B1A7d0': {
          'Size in GB': 100
        },
        'c10t5000CCA02201A769d0': {
          'Size in GB': 600
        },
        'c11t5000CCA022016B95d0': {
          'Size in GB': 600
        },
        'c12t5000CCA01603FA1Dd0': {
          'Size in GB': 600
        },
        'c13t5000CCA02201A10Dd0': {
          'Size in GB': 600
        },
        'c1t5000CCA0160E28C1d0': {
          'Size in GB': 600
        },
        'c2t5000CCA01605A655d0': {
          'Size in GB': 600
        },
        'c3t5000CCA0160B77D9d0': {
          'Size in GB': 600
        },
        'c4t5000CCA022040CE9d0': {
          'Size in GB': 600
        },
        'c5t5000CCA022016689d0': {
          'Size in GB': 600
        },
        'c6t5000CCA016101D7Dd0': {
          'Size in GB': 600
        },
        'c7t5000CCA016148739d0': {
          'Size in GB': 600
        },
        'c8t5000CCA02203E461d0': {
          'Size in GB': 600
        },
        'c9t5000CCA02203E4ADd0': {
          'Size in GB': 600
        }
      },
      'Boot Parameters': {
        'rabbitmq': 'guest:guest:10.3.1.23:5672',
        'hostname': '00-25-90-94-37-d4',
        'boot_time': '2013:0:30:18:10:27',
        'admin_nic': '00:25:90:94:37:d4',
        'external_nic': '90:e2:ba:26:59:6c'
      },
      'Network Interfaces': {
        'igb0': {
          'MAC Address': '00:25:90:94:37:d4',
          'ip4addr': '10.3.1.33',
          'Link Status': 'up',
          'NIC Names': [
            'admin'
          ]
        },
        'igb1': {
          'MAC Address': '00:25:90:94:37:d5',
          'ip4addr': '',
          'Link Status': 'unknown',
          'NIC Names': []
        },
        'igb2': {
          'MAC Address': '00:25:90:94:37:d6',
          'ip4addr': '',
          'Link Status': 'unknown',
          'NIC Names': []
        },
        'igb3': {
          'MAC Address': '00:25:90:94:37:d7',
          'ip4addr': '',
          'Link Status': 'unknown',
          'NIC Names': []
        },
        'ixgbe0': {
          'MAC Address': '90:e2:ba:26:59:6c',
          'ip4addr': '',
          'Link Status': 'unknown',
          'NIC Names': [
            'external'
          ]
        },
        'ixgbe1': {
          'MAC Address': '90:e2:ba:26:59:6d',
          'ip4addr': '',
          'Link Status': 'unknown',
          'NIC Names': []
        }
      },
      'Virtual Network Interfaces': {},
      'Link Aggregations': {},
      'Zpool': 'zones',
      'Zpool Creation': 1359153251,
      'Zpool Disks': 'c0t5000A7203007B1A7d0,c10t5000CCA02201A769d0,c11t5000CCA022016B95d0,c12t5000CCA01603FA1Dd0,c13t5000CCA02201A10Dd0,c1t5000CCA0160E28C1d0,c2t5000CCA01605A655d0,c3t5000CCA0160B77D9d0,c4t5000CCA022040CE9d0,c5t5000CCA022016689d0,c6t5000CCA016101D7Dd0,c7t5000CCA016148739d0,c8t5000CCA02203E461d0,c9t5000CCA02203E4ADd0',
      'Zpool Profile': 'mirror',
      'Zpool Size in GiB': 3283
    },
    'ram': 131043,
    'current_platform': '20130111T180733Z',
    'headnode': false,
    'boot_platform': '20130111T180733Z',
    'overprovision_ratio': 1,
    'reservation_ratio': 0.15,
    'traits': {},
    'rack_identifier': '',
    'comments': '',
    'uuid': '00000000-0000-0000-0000-0025909437d4',
    'reserved': false,
    'boot_params': {
      'rabbitmq': 'guest:guest:rabbitmq.us-beta-4.joyent.us:5672'
    },
    'default_console': 'vga',
    'serial': 'ttyb',
    'setup': true,
    'setting_up': false,
    'last_boot': '2013-01-30T18:11:13.000Z',
    'created': '2013-01-25T22:34:11.000Z',
    'transitional_status': '',
    'hostname': '00-25-90-94-37-d4',
    'last_heartbeat': '2013-08-23T14:58:20.111Z',
    'status': 'running',
    'overprovision_ratios': {
      'cpu': 4,
      'ram': 1,
      'disk': 1
    },
    'memory_available_bytes': 40111435776,
    'memory_arc_bytes': 71384713856,
    'memory_total_bytes': 137399590912,
    'disk_kvm_zvol_used_bytes': 0,
    'disk_kvm_zvol_volsize_bytes': 0,
    'disk_kvm_quota_bytes': 0,
    'disk_zone_quota_bytes': 3379065520128,
    'disk_cores_quota_bytes': 27943501824000,
    'disk_installed_images_used_bytes': 6539030016,
    'disk_pool_size_bytes': 3582002724864,
    'vms': {
      '0474f238-353f-4cad-90a1-fdde2a3e0c93': {
        'uuid': '0474f238-353f-4cad-90a1-fdde2a3e0c93',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '9c294396-cddf-44b7-924b-baaddbec4be6',
        'max_physical_memory': 512,
        'cpu_cap': 350,
        'last_modified': '2013-05-22T21:25:05.000Z',
        'create_timestamp': '2013-05-22T21:25:05.000Z',
        'quota': 10
      },
      '6f0a4b97-3642-48ba-bae1-b1215f4ad972': {
        'uuid': '6f0a4b97-3642-48ba-bae1-b1215f4ad972',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': 'd97bb63b-b7cb-4711-acc3-d9437619e71c',
        'max_physical_memory': 1024,
        'cpu_cap': 350,
        'last_modified': '2013-05-22T21:25:05.000Z',
        'create_timestamp': '2013-05-22T21:25:05.000Z',
        'quota': 15
      },
      '834bd053-ddb4-4d68-8bcd-5db976501cb6': {
        'uuid': '834bd053-ddb4-4d68-8bcd-5db976501cb6',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'max_physical_memory': 1024,
        'cpu_cap': 350,
        'last_modified': '2013-06-21T12:46:34.000Z',
        'create_timestamp': '2013-06-21T12:46:34.000Z',
        'quota': 15
      },
      '29d4f6b3-ccf1-481f-a0fa-5f04b0d4b853': {
        'uuid': '29d4f6b3-ccf1-481f-a0fa-5f04b0d4b853',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'max_physical_memory': 1024,
        'cpu_cap': 350,
        'last_modified': '2013-05-22T21:25:05.000Z',
        'create_timestamp': '2013-05-22T21:25:05.000Z',
        'quota': 15
      },
      '1ac5a633-c0ab-4bd3-9642-92f84470406f': {
        'uuid': '1ac5a633-c0ab-4bd3-9642-92f84470406f',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'max_physical_memory': 512,
        'cpu_cap': 350,
        'last_modified': '2013-05-22T21:25:06.000Z',
        'create_timestamp': '2013-05-22T21:25:06.000Z',
        'quota': 10
      },
      'ae9f609c-25b6-47fb-b429-e7e341a7875f': {
        'uuid': 'ae9f609c-25b6-47fb-b429-e7e341a7875f',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '390c229a-8c77-445f-b227-88e41c2bb3cf',
        'max_physical_memory': 512,
        'cpu_cap': 350,
        'last_modified': '2013-05-22T21:25:06.000Z',
        'create_timestamp': '2013-05-22T21:25:06.000Z',
        'quota': 10
      },
      'a90b17b8-527f-4b57-bef9-c429c2d90049': {
        'uuid': 'a90b17b8-527f-4b57-bef9-c429c2d90049',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '5c3a2297-e01b-4faf-9495-8d8c3314e08c',
        'max_physical_memory': 64,
        'cpu_cap': 350,
        'last_modified': '2013-05-14T18:23:07.000Z',
        'create_timestamp': '2013-05-14T18:23:07.000Z',
        'quota': 1024
      },
      '6b525cdd-8d0d-454a-9b0a-39cd654300cd': {
        'uuid': '6b525cdd-8d0d-454a-9b0a-39cd654300cd',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'cpu_cap': 700,
        'owner_uuid': 'f723a444-e17e-4c6f-a1f9-233ea4ccb48b',
        'max_physical_memory': 1024,
        'last_modified': '2013-05-14T18:23:08.000Z',
        'create_timestamp': '2013-05-14T18:23:08.000Z',
        'quota': 1024
      },
      '02dd4dd4-6393-457b-a859-359da549549c': {
        'uuid': '02dd4dd4-6393-457b-a859-359da549549c',
        'brand': 'joyent',
        'zone_state': 'running',
        'state': 'running',
        'owner_uuid': '13ed069e-d25e-47c9-a91f-0c202e25e945',
        'max_physical_memory': 64,
        'cpu_cap': 350,
        'last_modified': '2013-05-14T18:23:08.000Z',
        'create_timestamp': '2013-05-14T18:23:08.000Z',
        'quota': 1024
      }
    }
  }
];



var packages = [{
    uuid: '1ee2a2ab-2138-8542-b563-a67bb03792f7',
    active: true,
    cpu_cap: 250,
    max_lwps: 1000,
    max_physical_memory: 768,
    max_swap: 1536,
    name: 'sdc_768',
    quota: 25600,
    vcpus: 1,
    version: '1.0.0',
    zfs_io_priority: 10,
    overprovision_cpu: 4,
    overprovision_memory: 1,
    overprovision_storage: 1, 
    owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
    created_at: '2013-08-13T23:19:23.828Z',
    updated_at: '2013-08-13T23:19:23.828Z',
    default: false
  },
  {
    uuid: '73a1ca34-1e30-48c7-8681-70314a9c67d3',
    active: true,
    cpu_cap: 100,
    max_lwps: 1000,
    max_physical_memory: 128,
    max_swap: 256,
    name: 'sdc_128',
    quota: 25600,
    vcpus: 1,
    version: '1.0.0',
    zfs_io_priority: 10,
    overprovision_cpu: 4,
    overprovision_memory: 1,
    overprovision_storage: 1, 
    owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
    created_at: '2013-08-13T23:19:23.992Z',
    updated_at: '2013-08-13T23:19:23.992Z',
    default: true
  },
  {
    uuid: '5dfe2cc2-cea2-0841-8e01-6cafbe5b7dbc',
    active: true,
    cpu_cap: 250,
    max_lwps: 1000,
    max_physical_memory: 768,
    max_swap: 1536,
    name: 'sdc_imgapi',
    quota: 512000,
    vcpus: 1,
    version: '1.0.0',
    zfs_io_priority: 10,
    overprovision_cpu: 4,
    overprovision_memory: 1,
    overprovision_storage: 1, 
    owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
    created_at: '2013-08-13T23:19:24.006Z',
    updated_at: '2013-08-13T23:19:24.006Z',
    default: false
  }, 
  {
    uuid: '8d205d81-3672-4297-b80f-7822eb6c998b',
    active: false,
    cpu_cap: 400,
    max_lwps: 1000,
    max_physical_memory: 2048,
    max_swap: 4096,
    name: 'sdc_2048',
    quota: 25600,
    vcpus: 1,
    version: '1.0.0',
    zfs_io_priority: 20,
    overprovision_cpu: 4,
    overprovision_memory: 1,
    overprovision_storage: 1, 
    owner_uuid: '930896af-bf8c-48d4-885c-6573a94b1853',
    created_at: '2013-08-13T23:19:23.862Z',
    updated_at: '2013-08-13T23:19:23.862Z',
    default: false
  }
];



var images = [{
    v: '2',
    uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
    owner: '9dce1460-0c4c-4417-ab8b-25ca478c5a78',
    name: 'adminui',
    version: 'master-20130521T200112Z-g2d51b90',
    state: 'active',
    disabled: false,
    public: false,
    published_at: '2013-05-21T20:09:12.001Z',
    type: 'zone-dataset',
    os: 'smartos',
    files: [
      {
        sha1: '7de58b14c2196b2c3bb224ac770bfddb9e999123',
        size: 197345408,
        compression: 'gzip'
      }
    ],
    description: 'SDC AdminUI',
    requirements: {
      networks: [
        {
          name: 'net0',
          description: 'admin'
        }
      ]
    },
    tags: {
      smartdc_service: 'true'
    }
  },
  {
    v: '2',
    uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
    owner: '352971aa-31ba-496c-9ade-a379feaecd52',
    name: 'centos-6',
    version: '2.4.2',
    state: 'active',
    disabled: false,
    public: true,
    published_at: '2013-05-13T19:42:33Z',
    type: 'zvol',
    os: 'linux',
    files: [
      {
        sha1: 'c6a9b07d125bb821ed7ca979eca8f3943899aa75',
        size: 178215924,
        compression: 'gzip'
      }
    ],
    /* JSSTYLED */
    description: 'CentOS 6.4 64-bit image with just essential packages installed. Ideal for users who are comfortable with setting up their own environment and tools.',
    urn: 'sdc:sdc:centos-6:2.4.2',
    requirements: {
      networks: [
        {
          name: 'net0',
          description: 'public'
        }
      ],
      ssh_key: true
    },
    nic_driver: 'virtio',
    disk_driver: 'virtio',
    cpu_type: 'qemu64',
    image_size: 16384
  }
];



var expected = {
    capacities: [{
        package_uuid: '1ee2a2ab-2138-8542-b563-a67bb03792f7',
        image_uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
        slots: 104
      },
      {
        package_uuid: '1ee2a2ab-2138-8542-b563-a67bb03792f7',
        image_uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
        slots: 59
      },
      {
        package_uuid: '73a1ca34-1e30-48c7-8681-70314a9c67d3',
        image_uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
        slots: 133
      },
      {
        package_uuid: '73a1ca34-1e30-48c7-8681-70314a9c67d3',
        image_uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
        slots: 64
      },
      {
        package_uuid: '5dfe2cc2-cea2-0841-8e01-6cafbe5b7dbc',
        image_uuid: '8663eda9-247e-465f-8657-92a4c289b61a',
        slots: 6
      },
      {
        package_uuid: '5dfe2cc2-cea2-0841-8e01-6cafbe5b7dbc',
        image_uuid: '30e9e4c8-bbf2-11e2-ac3b-3b598ee13393',
        slots: 5
      }
    ]
};
/* END JSSTYLED */



var client;



exports.setUp = function (callback) {
    common.setup(function (err, _client) {
        assert.ifError(err);
        assert.ok(_client);
        client = _client;
        callback();
    });
};



exports.test_capacity = function (t) {
    var path = '/capacity';

    var data = { servers: servers,
                 packages: packages,
                 images: images };

    client.post(path, data, function (err, req, res, body) {
        t.ifError(err);
        t.equal(res.statusCode, 200);
        common.checkHeaders(t, res.headers);
        t.deepEqual(body, expected);
        t.done();
    });
};
