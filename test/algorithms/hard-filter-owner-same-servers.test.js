/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var filter = require('../../lib/algorithms/hard-filter-owner-same-servers.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

exports.filterSameServers = function (t)
{
	var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';

	var givenServers = [ {
		uuid: 'e28724d2-cef0-4bcb-b549-33b479464bb9',
		vms: {
			'36951518-79bc-4434-a3ff-b2e75979db7c': {
				owner_uuid: owner_uuid
			},
			'4a097e67-f1f5-4dbf-9a3c-fb7530526d85': {
				owner_uuid:
				    '9504253d-7af3-476a-9681-f72ab54ab96'
			},
			'e0f62893-99cb-4186-acee-0a36ab1a5a08': {
				owner_uuid:
				    'fe4896ad-e63d-46df-ba3f-a3f83fa49f70'
			}
		}
	},
	{
		uuid: '7f6b2cee-34a0-41fa-a2b2-bb6bdfea3031',
		vms: {
			'6e8c34e2-275d-4009-8431-417f9fb24229': {
				owner_uuid:
				    '0fe96be3-5b2c-4e54-8a25-3805f45cab26'
			},
			'b4f62751-9d6e-4c54-b38f-a5ace16aa44f': {
				owner_uuid:
				    '7abc989a-257d-4eb4-884f-e7e36787b385'
			},
			'bd44011c-7daf-4bb3-aeda-520094d50a4b': {
				owner_uuid:
				    '7f3daf93-e6cd-4bdb-8f47-507acbedad7c'
			}
		}

	},
	{
		uuid: 'b1c3c15b-b42e-408c-a55d-7ef0cc20a74b',
		vms: {
			'4abcf271-8112-433a-9816-1853e4f736b0': {
				owner_uuid:
				    'a39034a7-c197-416c-9aa4-77f475a9ff8a'
			},
			'd4a83cdb-d33c-4c8c-9eed-7053567083b9': {
				owner_uuid:
				    '4389962c-e5f7-4bd9-a59a-684cdeb5c352'
			},
			'50c28740-6119-41b7-a11c-519f66090f69': {
				owner_uuid: owner_uuid
			}
		}
	} ];

	var expectedServers = [ givenServers[1] ];
	var state = {};
	var constraints = { vm: { owner_uuid: owner_uuid } };

	var results = filter.run(log, state, givenServers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'e28724d2-cef0-4bcb-b549-33b479464bb9':
		    'VM\'s owner already has VM ' +
		    '36951518-79bc-4434-a3ff-b2e75979db7c on server',
		'b1c3c15b-b42e-408c-a55d-7ef0cc20a74b':
		    'VM\'s owner already has VM ' +
		    '50c28740-6119-41b7-a11c-519f66090f69 on server'
	};
	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.filterSameServers_with_no_servers = function (t)
{
	var owner_uuid = 'd4bb1b60-9172-4c58-964e-fe58a9989708';
	var state = {};
	var servers = [];
	var constraints = { vm: { owner_uuid: owner_uuid } };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
