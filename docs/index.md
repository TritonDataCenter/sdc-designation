---
title: Designation API (DAPI)
apisections: Allocation, Allocation Algorithms, Changelog
markdown2extras: wiki-tables, code-friendly
---
<!--
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
-->

<!--
    Copyright (c) 2015, Joyent, Inc.
-->

# sdc-designation (formerly known as DAPI)

This library's purpose is to choose a compute node (CN) on which to provision
a new VM or reservation: called "allocation". The API is [exposed on
CNAPI](https://github.com/joyent/sdc-cnapi/blob/master/docs/index.md#allocation-api).
See other parts of the CNAPI documentation for configuration details.

Note: In earlier SmartDataCenter releases this was its own service called "DAPI"
-- the DAPI name lives on in various parts of the code and docs.


# Allocation

Allocation (the main function of this lib) is exposed via:

    var Allocator = require('designation/lib/allocator');
    var allocator = new Allocator(log, algorithms, defaults);
    //...
    allocator.allocate(servers, vm, img, pkg, tickets, checkCapacity);

Some of the `allocate` arguments are described here:


## `vm`

The VM payload describes the VM to be allocated. For example, how much disk it
needs, how much RAM, and so forth. DAPI accepts arbitrary descriptions of the
VM, but the current version only considers the following characteristics:

|| **Attribute** || **Type** || **Description**                                      ||
|| vm_uuid       || string   || The UUID of the VM we're attempting to allocate      ||
|| ram           || integer  || RAM required, in MiB                                 ||
|| quota         || integer  || Disk required, in MiB                                ||
|| cpu_cap       || integer  || Max CPU allowed, in percent                          ||
|| traits        || hash     || Traits that a compute node must match                ||
|| nic_tags      || array    || If VLAN filtering is enabled, nic_tags needed for VM ||
|| owner_uuid    || string   || UUID of the new zone's owner                         ||
|| locality      || hash     || Hints for VM placement                               ||

The following are a couple of valid VM payload examples. The object must contain
at least ***ram*** and ***owner_uuid***.

    # Simplest example

    {
      "vm_uuid": "d84f8cd6-3e8f-4434-95f1-fc50cafde9e3",
      "ram": 2048,
      "owner_uuid": "73fa296f-a9dc-4677-9c06-4c610fc57160"
    }

    # More complete VM payload, similar to `vmadm get <uuid>`

    {
      "vm_uuid": "ef375f03-57ca-44a9-bc8d-63aec09fbc37",
      "brand": "joyent",
      "alias": "assets1",
      "ram": 64,
      "max_swap": 256,
      "quota": 10240,
      "cpu_cap": 100,
      "cpu_shares": 1,
      "max_lwps": 1000,
      "zpool": "zones",
      "zfs_io_priority": 10,
      "owner_uuid": "930896af-bf8c-48d4-885c-6573a94b1853",
      "nics": [],
      "customer_metadata": {},
      "internal_metadata": {},
      "tags": {},
      "traits": { "ssd": true }
      "locality": {
        "near": ["b91a0aaf-1a22-43b3-8462-e64ac2afb141"]
      }
    }



## `img`

The image manifest is what IMGAPI provides. It contains various information and
restrictions on VMs and CNs required by the dataset which will be used to create
a VM.

In contrast to VMs, image manifests are more strictly validated. Currently DAPI
understands the following characteristics:

|| **Attribute** || **Type** || **Description**                          ||
|| traits        || hash     || Traits that a compute node must match    ||
|| requirements  || hash     || Various restrictions that a CN must meet ||
|| image_size    || integer  || Size in MiB of KVM root filesystem       ||

Currently, DAPI considers the following attributes in ***requirements***, all
attributes being optional:

|| **Attribute** || **Type** || **Description**                             ||
|| min_ram       || integer  || Minimum RAM in MiB needed for a zone        ||
|| max_ram       || integer  || Maximum RAM in MiB allowed for a zone       ||
|| min_platform  || hash     || Minimum platform on a CN for an SDC version ||
|| max_platform  || hash     || Minimum platform on a CN for an SDC version ||

min_platform and max_platform are hashes with SDC versions as keys, and CN
platform versions as values. This is used to ensure that datasets which require
certain features from an underlying platform do not end up used in a VM on a CN
running a platform that doesn't support those features (the platform either
being too old, or no longer supporting a removed feature).

An example of a valid manifest:

    {
      "image_size": 10240,
      "traits": {
        "ssd": true
      },
      "requirements": {
        "min_ram": 1024,
        "min_platform": {
          "6.5": "20121211T203034Z",
          "7.0": "20121117T221253Z"
        }
      }
    }



## `servers`

The same way the VM payload follows the format that vmadm provides, the servers
payload that is required by the allocation endpoint is expected to be CNAPI
"compatible". CNAPI is the entity that manages and exposes all the information
related to servers in an SDC install, and therefore it provides the standard
representation for a server object.  Each entry in the servers array
passed to DAPI's allocator must contain a subset of the information
provided by CNAPI, as described below.

In contrast to VMs, server payloads are more strictly validated. DAPI
accepts arbitrary descriptions of each server, but only the attributes
described by the [DAPI servers
schema](https://github.com/joyent/schemas/blob/master/lib/dapi/server.js)
are considered.  For convenience, these attributes are listed here;
however, the schema description governs.

|| **Attribute**          || **Type** || **Description**                                 ||
|| uuid                   || string   || UUID of server                                  ||
|| memory_available_bytes || integer  || RAM available for allocation, in bytes          ||
|| memory_total_bytes     || integer  || Total RAM on server, in bytes                   ||
|| disk_pool_size_bytes   || integer  || Total storage pool size, in bytes               ||
|| disk_installed_images_used_bytes || integer || Storage pool space consumed by images, bytes ||
|| disk_zone_quota_bytes  || integer  || Storage pool quota for all zone root datasets   ||
|| disk_kvm_quota_bytes   || integer  || Storage pool quota for all KVM disk zvols       ||
|| disk_cores_quota_used_bytes      || integer || Storage pool space consumed by corefiles, bytes ||
|| overprovision_ratios   || object   || Deprecated ||
|| reservation_ratio      || float    || Fraction of DRAM to reserve for ZFS ARC and OS  ||
|| reserved               || boolean  || If the server has been reserved by an operator  ||
|| setup                  || boolean  || If the server has been setup                    ||
|| sysinfo                || hash     || A description of the system's hardware state provided by sysinfo(1) ||
|| traits                 || hash     || Operator-supplied traits; these are matched to instance class traits ||
|| vms                    || hash     || Description of VMs already on server            ||

The ***vms*** attribute is a hash. Each key is a VM UUID, and each value is a
hash with the following format:

|| **Attribute**       || **Type** || **Description**                         ||
|| cpu_cap             || integer  || Max CPU allowed, in percent             ||
|| last_modified       || date     || Time of last instance modification      ||
|| max_physical_memory || integer  || RAM promised to this VM, in MiB         ||
|| owner_uuid          || string   || UUID of VM's owner                      ||
|| quota               || integer  || Disk promised to this VM, in MiB        ||
|| state               || string   || Current instance liveness               ||

As an example of a valid server payload:

```
	{
		uuid: '2bb4c1de-16b5-11e4-8e8e-07469af29312',
		overprovision_ratios: { ram: 1.5 },
		memory_total_bytes: 549755813888,
		memory_available_bytes: 322122547200,
		disk_pool_size_bytes: 4000000000000,
		disk_installed_images_used_bytes: 3221225472,
		disk_zone_quota_bytes: 32212254720,
		disk_kvm_quota_bytes: 0,
		disk_kvm_zvol_volsize_bytes: 0,
		disk_cores_quota_used_bytes: 0,
		reservation_ratio: 0.15,
		reserved: false,
		setup: true,
		sysinfo: {
			'CPU Total Cores': 32,
			'Network Interfaces': {
				'igb0': {
					'MAC Address': '00:25:90:95:89:50',
					'Link Status': 'up',
					'NIC Names': []
				},
			},
			'Live Image': '20140710T010203Z'
		},
		vms: {
			'62559b33-4f3a-4505-a942-87cc557fdf4e': {
				owner_uuid: 'e14b2bef-e75f-43f6-9590-ff4c3d18fad6',
				brand: 'joyent',
				state: 'failed',
				cpu_cap: 350,
				quota: 20,
				max_physical_memory: 512,
				last_modified: '2014-03-12T13:10:45.293Z'
			},
			'335498f7-a1ed-420c-8367-7f2769ca1e84': {
				owner_uuid: '24ccd11a-fb18-45e8-99ea-a2b561352526',
				brand: 'joyent',
				state: 'running',
				cpu_cap: 350,
				quota: 10,
				max_physical_memory: 4096,
				last_modified: '2014-03-12T12:49:49.246Z'
			}
		}
	}
```



## `pkg`

The package contains details that the VM payload does not provide, like certain
defaults.

|| **Attribute**         || **Type** || **Description**                                  ||
|| alloc_server_spread   || string   || Optionally change how VMs are spread across CNs (one of: min-ram, max-ram, min-owner, and random) ||
|| cpu_cap               || integer  || Upper limit on how much CPU a zone can use.      ||
|| max_physical_memory   || integer  || VM RAM size in MiB                               ||
|| min_platform          || hash     || Minimum platform on a CN for an SDC version      ||
|| overprovision_cpu     || float    || Ratio for maximum overprovisioning on CPU        ||
|| overprovision_memory  || float    || Ratio for maximum overprovisioning on RAM        ||
|| overprovision_storage || float    || Ratio for maximum overprovisioning on disk space ||
|| overprovision_io      || float    || Currently ignored                                ||
|| overprovision_network || float    || Currently ignored                                ||
|| quota                 || integer  || VM disk size in MiB                              ||
|| traits                || hash     || Traits that a compute node must match            ||

Traits that the package provides can be overridden by traits in the VM payload.

min_platform follows the same rules as min_platform in an image. Please see the
Image Manifest section above.

Each overprovision ratio is optional. If a ratio is provided, DAPI will attempt
to ensure that the ratio (or better) is kept. If a ratio is not provided, DAPI
will assume that overprovisioning on that resource does not matter, and will
completely disregard maintaining any ratio. This feature only works if the
allocation chain has been set up properly -- overprovisioning is disabled by
default.

E.g. if you want to guarantee that CPU is not overprovisioned, provide an
overprovision_cpu of 1.0. If you'd like to overprovision CPU by two, use
overprovision_cpu of 2.0. If you really don't care whether it's overprovisioned
or not, do not provide an overprovision_cpu.

By default, if a package does not provide any overprovision ratios at all,
DAPI will default to using a single ratio: an overprivison_memory of 1.0.

An example of a valid package payload:

    {
      "overprovision_memory": 1.5,
      "overprovision_storage": 1.0,
      "traits": {
        "ssd": true
      }
    }

For more details, see the PAPI docs, which describe the meanings of package
attribute in more depth.



## defaults

Some default values can be altered upon allocator initialisation.

|| **Attribute**            || **Type** || **Default** || **Description** ||
|| disable_override_overprovisioning || Boolean || false || Whether the override-overprovisioning plugin should be disabled. ||
|| filter_headnode          || Boolean  || true    || Whether to remove the headnode from consideration for a new VM.       ||
|| filter_min_resources     || Boolean  || true    || Whether to filter out CNs which don't have enough space for a new VM. ||
|| filter_large_servers     || Boolean  || true    || Whether to remove large empty servers as much as possible.            ||
|| filter_vm_limit          || Integer  || 224     || Maximum number of VMs allowed on one CN.                              ||
|| overprovision_ratio_cpu  || Float    || 4.0     || How much CPU can be overprovisioned per CN.                           ||
|| overprovision_ratio_ram  || Float    || 1.0     || How much RAM can be overprovisioned per CN.                           ||
|| overprovision_ratio_disk || Float    || 1.0     || How much disk space can be overprovisioned per CN.                    ||
|| server_spread            || String   || min-ram || How VMs are spread across servers.                                    ||

`server_spread` can be one of 'min-ram', 'max-ram', 'random', or 'min-owner'. 
min-ram tries to place new VMs on the CNs with the least free RAM. max-ram does
the opposite. min-owner tries to place VMs on CNs which have the least other
VMs belonging to the same owner. And random places VMs randomly across CNs.


# Allocation Algorithms

Designation provides the ability for users to install custom allocation
algorithms and test several allocation strategies without the need to modify the
application source code. An allocation algorithm takes a list of servers and
various other pieces of data as input, and returns a filtered list of servers.

*Note: CNAPI's configuration file's "dapi" key controls current sdc-designation
config. Start there. This section might be out of date.*

By default -- if sdc-designations's configuration file doesn't specify an
`allocationDescription` -- the chain of algorithms defined by
`DEFAULT_DESC` in [lib/allocator.js](../lib/allocator.js) will be used.

This default description gives reasonable allocation results for a datacenter;
make sure to do your research before modifying it. The description is organized
as a list of algorithms and lists, each list prefixed with a command. For
example:

    ['pipe', 'hard-filter-min-ram',
             'hard-filter-running',
             ['or', 'hard-filter-large-servers',
                    'hard-filter-recent-servers'],
             'pick-weighted-random']

The 'pipe' and 'or' are commands, and the rest of the elements in the list will
be executed in that context. 'pipe' forms a pipeline, feeding the output (list
of servers) from one algorithms to the input of the next. 'or' feeds an
identical list of servers to each plugin in turn, until one of the plugins
returns a non-empty list of servers.

To change to default chain, edit DAPI's configuration file
(***$DAPI_ROOT/config.json***). Edit or add the 'algorithms' attribute:

    ...
    "allocationDescription": ["pipe", "hard-filter-setup",
                                      "hard-filter-min-ram",
                                      "pick-random"],
    ...

In this case, a pipeline of only those three algorithms would be used in
selecting a compute node for the VM.

Custom algorithms can be added under ***$DAPI_ROOT/lib/algorithms/***, but be
aware that you'll need to add the custom file back after any DAPI zone upgrade.



## Provided Algorithms

*Note: This list may be a little out of date. See
[lib/algoritms](../lib/alogrithms/) for the authoritative list.*

|| **Name**                        || **Action**                                                  ||
|| calculate-locality              || Early calculations needed by the soft-filter-locality-hints plugin   ||
|| calculate-recent-vms            || Adds recent VMs to pipeline if they haven't appeared yet in CNAPI    ||
|| calculate-server-unreserved     || Does some free-resource calculations that are used by other plugins  ||
|| hard-filter-headnode            || Removes any headnodes                                       ||
|| hard-filter-invalid-servers     || Removes any server objects which don't pass validation      ||
|| hard-filter-large-servers       || Removes the top 15% servers with the most available RAM     ||
|| hard-filter-min-cpu             || Removes CNs with insufficient CPU                           ||
|| hard-filter-min-disk            || Removes CNs with insufficient disk                          ||
|| hard-filter-min-ram             || Removes CNs with insufficient RAM                           ||
|| hard-filter-overprovision-ratios || Removes CNs with different overprovision ratios than the request    ||
|| hard-filter-owner-same-racks    || Removes racks already containing an owner's VM(s)           ||
|| hard-filter-owner-same-servers  || Removes servers already containing an owner's VM(s)         ||
|| hard-filter-platform-versions   || Removes servers that don't pass image manifest platform requirements ||
|| hard-filter-reserved            || Removes reserved CNs                                        ||
|| hard-filter-reservoir           || Removes reservoir CNs                                       ||
|| hard-filter-running             || Removes CNs which are not running                           ||
|| hard-filter-setup               || Removes CNs which are not setup                             ||
|| hard-filter-traits              || Removes CNs with traits that cannot fulfill VM traits       ||
|| hard-filter-vlans               || Removes CNs which do not have required nic tags             ||
|| hard-filter-vm-count            || Removes CNs with more than 223 (default) VMs                ||
|| hard-filter-volumes-from        || Removes CNs which do not contain VMs listed in docker:volumesfrom metadata, if provided ||
|| identity                        || Returns the same servers it received                        ||
|| override-overprovisioning       || Substitutes package and server overprovision data for own defaults   ||
|| pick-random                     || Pick a random CN from a list                                ||
|| pick-weighted-random            || Pick one of top 20% of CNs so far                           ||
|| soft-filter-large-servers       || Tries to reserve some servers for large VMs                 ||
|| soft-filter-locality-hints      || Tries to place VM near or far from other given VMs          ||
|| soft-filter-recent-servers      || Tries to ignore recently allocated-to CNs, to prevent races ||
|| sort-2adic                      || Order CNs by 2adic ordering of available RAM                ||
|| sort-min-ram                    || Order CNs by how little available RAM is left               ||
|| sort-max-ram                    || Order CNs by available RAM, most RAM first                  ||

The allocation pipeline typically starts with the hard filters, then soft
filters, then sorters, and finally a picker.

Hard filters remove CNs from allocation consideration because the compute node
fails to fulfill some requirement. Soft filters remove some compute nodes from
consideration if there's still enough compute nodes left afterwards to
effectively allocate with. Sorters order compute nodes by how desirable they are
to fulfill this allocation request -- most desirable come first. Lastly, the
pickers pick one of the compute nodes; some pickers take order into account, and
some do not.



## Traits

Although traits are only used by one algorithm, they serve the important purpose
of describing arbitrary user-defined requirements for a VM and image manifest,
and matching those requirements with CNs that can fulfill them. Ergo I'll
describe how they work here.

Imagine for a moment you'd like to reserve some servers for just one customer.
In this cause you'd add a customer trait to both the CNs and to the VM request.
E.g.

Server object:

    {
      "uuid": "cdc1b052-1df9-4a3d-b34d-3f0afadac883",
      "memory_total_bytes": 2147483648,
      ...
      "traits": {
        "customer": "9b81f9e7-55e1-4e00-a8f7-917bd054b320"
      }
    }

VM request:

    {
      "ram": 2048,
      "traits": {
        "customer": "9b81f9e7-55e1-4e00-a8f7-917bd054b320"
      }
    }

It does not need to be named ***customer*** specifically; it could be named
***owner*** or something else, so long as the attribute name matches between
both the server trait and the VM request trait. The VM request requires a
compute node with a trait named "customer" and value
"9b81f9e7-55e1-4e00-a8f7-917bd054b320". The compute node has both that name and
value in the traits, so it can fulfill this request.

The same applies for booleans:

    {
      "ram": 2048,
      "traits": {
        "ssd": true
      }
    }

Any compute node that has a single trait named ***ssd*** and a value of true
will match.

Multiple traits can be used:

    {
      "ram": 2048,
      "traits": {
        "ssd": false,
        "manta": true,
        "customer": "9b81f9e7-55e1-4e00-a8f7-917bd054b320"
      }
    }

In which case only compute nodes that have traits like this will match:

    {
      "uuid": "cdc1b052-1df9-4a3d-b34d-3f0afadac883",
      "memory_total_bytes": 2147483648,
      ...
      "traits": {
        "ssd": false,
        "manta": true,
        "customer": "9b81f9e7-55e1-4e00-a8f7-917bd054b320"
      }
    }

Things get a bit more complicated with arrays: traits also allow arrays of
strings for a given name, in both VM requests and on compute nodes. If a VM
trait has a string and a compute node's associated trait has an array of
strings, then that compute node will match if the VM's string matches any of the
ones in the compute node's. The opposite applies as well, with the compute node
trait having an array of strings, and the VM trait being a single string. An
example:

    {
      "ram": 2048,
      "traits": {
        "customer": "9b81f9e7-55e1-4e00-a8f7-917bd054b320"
      }
    }

    {
      "uuid": "cdc1b052-1df9-4a3d-b34d-3f0afadac883",
      "memory_total_bytes": 2147483648,
      ...
      "traits": {
        "customer": ["9b81f9e7-55e1-4e00-a8f7-917bd054b320",
                     "82c53a64-b19c-4266-bf16-3ee1d34318d2"]
      }
    }

The above compute node will match because the VM request is looking for customer
9b81f9e7..., and the compute node can fulfill 9b81f9e7... and 82c53a64... .

Lastly, if a VM trait contains an array of strings, and the compute node does
as well, the compute node will match if there's an intersection in the array
values. In other words, if any values in the VM trait matches any values in the
compute node's trait. E.g. the following will match because "richmond-a" is in
common between the two (and ssd is true for both too, just to demonstrate):

    {
      "ram": 2048,
      "traits": {
        "hw": ["richmond-a", "mantis-shrimp"],
        "ssd": true
      }
    }

    {
      "uuid": "cdc1b052-1df9-4a3d-b34d-3f0afadac883",
      "memory_total_bytes": 2147483648,
      ...
      "traits": {
        "hw": ["richmond-b", "richmond-a"]
        "ssd": true
      }
    }

Image manifests also can contain traits, and they take priority over traits in
a VM payload. A union is made between traits between the VM payload and image
manifest, attributes from the image manifest's traits taking priority when both
the VM payload and image manifest share some attributes in their traits, and
the resulting traits union is used to match against CN traits.



## Locality Hints

Under many circumstances it is desirable to have a new VM placed near or far
from existing VMs. For example, VMs containing two replicating databases
probably should be kept far from each other, in case a server or rack loses
power. Or consider a webhead and a cache -- keeping a webapp in the same rack
as memcache provides better performance.

Specifying locality hints is optional. By default DAPI tries to keep a
customer's VMs on separate racks or servers for high-availability reasons.
However, an allocation request can specify one or more VMs for DAPI to try to
allocate near or far from.

This hint will try to allocate a server near one VM, and far from the other
three. Note that allocating a new VM far from other VMs take precedence over
near VMs, since high availability is usually more important than performance:

    "locality": {
      "near": "803e6c05-7c89-464f-b8f7-37aa99ee3ead",
      "far": ["53e93593-6c4b-4268-963f-32633f526548",
              "a48514a8-95ec-4c2e-a874-63c332a7c8bc",
              "1988fa44-b849-449f-abf0-ab0f198d862e"]
    }

"near" and "far" are both optional, and can either be a UUID or arrays of UUIDs.

By default, hints are hints: if the constraints cannot be fulfilled, a placement
is still found for a VM. In many cases we want a guarantee about placement. In
that case, providing a `strict` attribute set to true will achieve this:

    "locality": {
      "strict": true,
      "near": "803e6c05-7c89-464f-b8f7-37aa99ee3ead",
      "far": ["53e93593-6c4b-4268-963f-32633f526548",
              "a48514a8-95ec-4c2e-a874-63c332a7c8bc",
              "1988fa44-b849-449f-abf0-ab0f198d862e"]
    }

When `strict` is true, either a server will be found that fulfills all
requirements, or the allocation will fail. An example is a request that wants to
guarantee a new database VM does not end up on the same server as a different
database VM, for HA purposes.

Strict will only work with servers that have had their `rack_identifier`
correctly set. If the `rack_identifier`s in a DC have not been set, attempts to
allocate with `strict` true will fail, except in some undefined cases.