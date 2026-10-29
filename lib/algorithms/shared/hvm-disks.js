/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2026 Edgecast Cloud LLC.
 */

/*
 * Helpers for sizing the zvols of HVM (bhyve and kvm) instances.
 */

var assert = require('assert-plus');

// vmadm's default zone root quotas, in GiB. These should match DEFAULT_QUOTA
// and DEFAULT_BHYVE_QUOTA in smartos-live/src/vm/node_modules/VM.js.
var DEFAULT_QUOTA = 10;
var DEFAULT_BHYVE_QUOTA = 1;

function
isSize(size)
{
	return (typeof (size) === 'number' && isFinite(size) && size >= 0);
}

/*
 * Returns the MiB of zvol space requested by an HVM instance's disks, or null
 * if neither flexible_disk_size nor disks were given. Returns NaN if a size
 * cannot be determined, e.g. a disk with size 'remaining', or a non-image disk
 * without a size.
 *
 * flexible_disk_size already covers every disk, including the boot disk. An
 * image disk without an explicit size takes the image's size. Disks whose
 * media is not 'disk' (e.g. cdroms) are not counted.
 */
function
requestedDisksSize(vm, imageSize)
{
	assert.object(vm, 'vm');
	assert.optionalNumber(imageSize, 'imageSize');

	if (vm.flexible_disk_size !== undefined) {
		return (isSize(vm.flexible_disk_size) ?
		    vm.flexible_disk_size : NaN);
	}

	if (!Array.isArray(vm.disks))
		return (null);

	return (vm.disks.reduce(function (acc, disk) {
		var size = disk.size;

		// cdroms are not backed by a zvol
		if (disk.media !== undefined && disk.media !== 'disk')
			return (acc);

		if (size === undefined && disk.image_uuid)
			size = disk.image_size || imageSize;

		return (isSize(size) ? acc + size : NaN);
	}, 0));
}

/*
 * Returns the zone root quota, in GiB, that vmadm will give this instance.
 */
function
rootQuota(vm)
{
	assert.object(vm, 'vm');

	if (vm.quota !== undefined && vm.quota !== null)
		return (vm.quota);

	return (vm.brand === 'bhyve' ? DEFAULT_BHYVE_QUOTA : DEFAULT_QUOTA);
}

module.exports = {
	requestedDisksSize: requestedDisksSize,
	rootQuota: rootQuota
};
