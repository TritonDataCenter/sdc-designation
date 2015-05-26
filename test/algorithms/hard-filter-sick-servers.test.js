/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/hard-filter-sick-servers.js');


var log = {
	trace: function () { return (true); },
	debug: function () { return (true); }
};


test('filterSickServers()', function (t) {
	var givenServers = [ {
		/* should be included because doesn't have two failures */
		uuid: '647d5e40-bab5-465e-b351-311eec116822',
		vms: {
			'c00bbac2-b00a-4aea-af10-d0c0cdc4c0b2': {
				uuid: 'c00bbac2-b00a-4aea-af10-d0c0cdc4c0b2',
				state: 'running',
				last_modified: ago(120)
			},
			'6d8ff8cb-bc78-47ed-9747-9282d9953216': {
				uuid: '6d8ff8cb-bc78-47ed-9747-9282d9953216',
				state: 'running',
				last_modified: ago(119)
			},
			'430f486b-282e-c1f2-999f-fbba24955d95': {
				uuid: '430f486b-282e-c1f2-999f-fbba24955d95',
				state: 'running',
				last_modified: ago(118)
			}
		}
	}, {
		/* should be included because failures aren't consecutive */
		uuid: 'a6d28604-cc8c-4dad-a1c6-81be1b3b9deb',
		vms: {
			'c357e869-833d-4f6e-bbb4-883b97a7b555': {
				uuid: 'c357e869-833d-4f6e-bbb4-883b97a7b555',
				state: 'failed',
				last_modified: ago(120)
			},
			'0ef239f7-9c1c-4e01-92a2-0ff8a6f67161': {
				uuid: '0ef239f7-9c1c-4e01-92a2-0ff8a6f67161',
				state: 'running',
				last_modified: ago(119)
			},
			'41e59b1c-0bbf-486f-8550-1008d5a916b2': {
				uuid: '41e59b1c-0bbf-486f-8550-1008d5a916b2',
				state: 'failed',
				last_modified: ago(118)
			}
		}
	}, {
		/* should be excluded because two consecutive failures */
		uuid: '5625eacc-e173-4bb0-9c22-b1a80d8dfa39',
		vms: {
			'04fd84ed-5fa9-4252-b276-31339b1e5cd0': {
				uuid: '04fd84ed-5fa9-4252-b276-31339b1e5cd0',
				state: 'running',
				last_modified: ago(23 * 60)
			},
			'70d46ece-1158-423c-b3a6-e569f688e0b5': {
				uuid: '70d46ece-1158-423c-b3a6-e569f688e0b5',
				state: 'failed',
				last_modified: ago(22 * 60)
			},
			'c9b7d347-7f98-48ee-8b8a-165f749e7ced': {
				uuid: 'c9b7d347-7f98-48ee-8b8a-165f749e7ced',
				state: 'failed',
				last_modified: ago(20 * 60)
			}
		}
	}, {
		/*
		 * should be included because both failures weren't
		 * in the past 24h
		 */
		uuid: '899821d8-750b-445d-a2c9-289ffad5b07d',
		vms: {
			'65c71cb6-ad22-4a8d-9961-33a87e3b20eb': {
				uuid: '65c71cb6-ad22-4a8d-9961-33a87e3b20eb',
				state: 'running',
				last_modified: ago(36 * 60)
			},
			'25a73c08-7b9e-4534-9256-7943592b48b1': {
				uuid: '25a73c08-7b9e-4534-9256-7943592b48b1',
				state: 'failed',
				last_modified: ago(25 * 60)
			},
			'ed4c3dc3-73b0-478f-bd5f-7880e1c9e0f8': {
				uuid: 'ed4c3dc3-73b0-478f-bd5f-7880e1c9e0f8',
				state: 'failed',
				last_modified: ago(20 * 60)
			}
		}
	}, {
		/* should be included because only one failure */
		uuid: '43b04a69-06c1-41cb-8adf-afc6734ce30d',
		vms: {
			'8c10b6e1-43ac-4349-ab78-7d3f28a29248': {
				uuid: '8c10b6e1-43ac-4349-ab78-7d3f28a29248',
				state: 'failed',
				last_modified: ago(120)
			}
		}
	}, {
		/* should be included since no failures */
		uuid: 'de324e5f-e195-4db8-84f1-d33d628f1944',
		vms: {}
	}, {
		/* should be included since no failures */
		uuid: '4b557554-43ee-4281-86d5-cb6332762d6f'
	} ];

	var expectedServers = [ givenServers[0], givenServers[1],
	    givenServers[3], givenServers[4], givenServers[5],
	    givenServers[6] ];
	var state = {};

	var results = filter.run(log, state, givenServers, {});
	var filteredServers = results[0];
	var reasons = results[1];

	t.deepEqual(filteredServers, expectedServers);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {
		/* BEGIN JSSTYLED */
		'5625eacc-e173-4bb0-9c22-b1a80d8dfa39': 'VMs c9b7d347-7f98-48ee-8b8a-165f749e7ced and 70d46ece-1158-423c-b3a6-e569f688e0b5 failed consecutively the past 24h'
		/* END JSSTYLED */
	});

	t.end();
});


test('filterSickServers() with no servers', function (t) {
	var state = {};

	var results = filter.run(log, state, [], {});
	var filteredServers = results[0];
	var reasons = results[1];

	t.equal(filteredServers.length, 0);
	t.deepEqual(state, {});
	t.deepEqual(reasons, {});

	t.end();
});


test('name', function (t) {
	t.ok(typeof (filter.name) === 'string');
	t.end();
});


function
ago(min)
{
	return (new Date(+new Date() - min * 60 * 1000).toISOString());
}
