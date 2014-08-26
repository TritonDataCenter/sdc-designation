/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var filter = require('../../lib/algorithms/hard-filter-ticketed-servers.js');

var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};

var servers = [ {
	uuid: 'e28724d2-cef0-4bcb-b549-33b479464bb9',
	vms: {
		'36951518-79bc-4434-a3ff-b2e75979db7c': {},
		'4a097e67-f1f5-4dbf-9a3c-fb7530526d85': {},
		'e0f62893-99cb-4186-acee-0a36ab1a5a08': {}
	}
}, {
	uuid: '7f6b2cee-34a0-41fa-a2b2-bb6bdfea3031',
	vms: {
		'6e8c34e2-275d-4009-8431-417f9fb24229': {},
		'b4f62751-9d6e-4c54-b38f-a5ace16aa44f': {},
		'bd44011c-7daf-4bb3-aeda-520094d50a4b': {}
	}
}, {
	uuid: '16ea76db-95c2-4687-8057-8900365f60c2',
	vms: {
		'94b556bf-0236-4206-b812-8d5071ef7a3f': {},
		'afee76c7-3c96-4744-810c-c27f1efc8c92': {},
		'3b0f69d3-02c7-4577-91f0-7203285e1435': {}
	}
} ];

var tickets = [ {
	/* correct VM and server_uuid, but expired */
	id: '36951518-79bc-4434-a3ff-b2e75979db7c',
	scope: 'vm',
	server_uuid: 'e28724d2-cef0-4bcb-b549-33b479464bb9',
	status: 'expired',
	action: 'provision'
}, {
	/* correct VM and server_uuid, but wrong scope */
	id: '36951518-79bc-4434-a3ff-b2e75979db7c',
	scope: 'server',
	server_uuid: 'e28724d2-cef0-4bcb-b549-33b479464bb9',
	status: 'active',
	action: 'provision'
}, {
	/* correct VM and server_uuid, but wrong action */
	id: '36951518-79bc-4434-a3ff-b2e75979db7c',
	scope: 'vm',
	server_uuid: 'e28724d2-cef0-4bcb-b549-33b479464bb9',
	status: 'active',
	action: 'change-nic'
}, {
	/* all correct (but VM on different server) */
	id: '6e8c34e2-275d-4009-8431-417f9fb24229',
	scope: 'vm',
	server_uuid: '7f6b2cee-34a0-41fa-a2b2-bb6bdfea3031',
	status: 'active',
	action: 'provision'
}, {
	/* all correct (but VM is unlisted in servers) */
	id: '0c732437-bf77-481a-9678-0e6ad53481bc',
	scope: 'vm',
	server_uuid: '16ea76db-95c2-4687-8057-8900365f60c2',
	status: 'active',
	action: 'provision'
} ];

exports.filterTickets = function (t)
{
	var expectedServers = servers.slice(0, 2);
	var state = {};
	var constraints = { tickets: tickets };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});

	var expectedReasons = {
		'16ea76db-95c2-4687-8057-8900365f60c2':
			'Server is currently provisioning VM ' +
			'0c732437-bf77-481a-9678-0e6ad53481bc'
	};
	t.deepEqual(reasons, expectedReasons);

	t.done();
};

exports.filterTickets_with_no_servers = function (t)
{
	var state = {};
	var constraints = { tickets: tickets };

	var results = filter.run(log, state, [], constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, []);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.done();
};

exports.filterTickets_with_no_tickets = function (t)
{
	var expectedServers = servers;
	var state = {};
	var constraints = { tickets: [] };

	var results = filter.run(log, state, servers, constraints);
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.done();
};

exports.name = function (t)
{
	t.ok(typeof (filter.name) === 'string');
	t.done();
};
