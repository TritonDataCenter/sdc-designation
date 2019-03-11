/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2019 Joyent, Inc.
 */

var test = require('tape');
var filter = require('../../lib/algorithms/calculate-affinity.js');
var common = require('./common.js');


var OWNER_UUID = 'b20ae67c-48d9-11e9-bef6-17de1751b73a';
var SERVERS = [ {
	uuid: '81d14dce-497a-11e9-97e5-d72e945337f6'
}, {
	uuid: '883e90f4-497a-11e9-bef3-2f3dd387291d'
} ];
var LOG = {
	info: function () {},
	debug: function () {},
	fields: { req_id: 'foo' }
};


function getDefaultOpts(t) {
	return {
		log: LOG,
		getVm: function getVm() {
			t.fail('should not call getVm()');
		},
		listVms: function listVms() {
			t.fail('should not call listVms()');
		},
		vm: {
			owner_uuid: OWNER_UUID
		}
	};
}


test('calculateLocalityHints() with no affinity', function test1(t) {
	var opts = getDefaultOpts(t);

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, { skip: 'No affinity found' }, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with empty affinity', function test2(t) {
	var opts = getDefaultOpts(t);
	opts.vm.affinity = [];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() does not override locality when no affinity',
function test3(t) {
	var opts = getDefaultOpts(t);
	opts.vm.locality = { foo: 'bar' };

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, { skip: 'No affinity found' }, 'reasons');
		t.deepEqual(opts.vm.locality, { foo: 'bar' }, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with affinity, getVm() success',
function test4(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: { eq: [ 'alias', 'webhead3' ] },
			state: 'active',
			fields: 'uuid,alias'
		}, 'args');
		cb(null, [ { uuid: 'fb02171e-4970-11e9-b315-7f49301411e7' } ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '!=',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			strict: true,
			far: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ]
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints(), container behaves same as instance',
function test5(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: { eq: [ 'alias', 'webhead3' ] },
			state: 'active',
			fields: 'uuid,alias'
		}, 'args');
		cb(null, [ { uuid: 'fb02171e-4970-11e9-b315-7f49301411e7' } ]);
	};

	opts.vm.affinity = [ {
		key: 'container',
		operator: '!=',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			strict: true,
			far: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ]
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with affinity, getVM() fail, prefix found',
function test6(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			t.deepEqual(args, {
				owner_uuid: OWNER_UUID,
				predicate: { eq: [ 'alias', 'webhead3' ] },
				state: 'active',
				fields: 'uuid,alias'
			}, 'args');
			cb(null, []);
			return;
		}

		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			state: 'active',
			fields: 'uuid,alias,internal_metadata,docker'
		}, 'args');
		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			docker: true,
			internal_metadata: { 'docker:id': 'webhead3' }
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '!=',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			strict: true,
			far: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ]
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with affinity, getVM() fail, prefix not found',
function test7(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			t.deepEqual(args, {
				owner_uuid: OWNER_UUID,
				predicate: { eq: [ 'alias', 'webhead3' ] },
				state: 'active',
				fields: 'uuid,alias'
			}, 'args');
			cb(null, []);
			return;
		}

		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			state: 'active',
			fields: 'uuid,alias,internal_metadata,docker'
		}, 'args');
		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			docker: true,
			internal_metadata: { 'docker:id': 'webhead2' }
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '!=',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with affinity, getVM() fail, not docker',
function test8(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			t.deepEqual(args, {
				owner_uuid: OWNER_UUID,
				predicate: { eq: [ 'alias', 'webhead3' ] },
				state: 'active',
				fields: 'uuid,alias'
			}, 'args');
			cb(null, []);
			return;
		}

		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			state: 'active',
			fields: 'uuid,alias,internal_metadata,docker'
		}, 'args');
		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			docker: false,
			internal_metadata: { 'docker:id': 'webhead3' }
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '!=',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with == instance, VM found',
function test9(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: { eq: [ 'alias', 'webhead3' ] },
			state: 'active',
			fields: 'uuid,alias'
		}, 'args');
		cb(null, [ { uuid: 'fb02171e-4970-11e9-b315-7f49301411e7' } ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: true
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with ==~ instance, VM found',
function test10(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: { eq: [ 'alias', 'webhead3' ] },
			state: 'active',
			fields: 'uuid,alias'
		}, 'args');
		cb(null, [ { uuid: 'fb02171e-4970-11e9-b315-7f49301411e7' } ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: 'webhead3',
		isSoft: true,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: false
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with == instance, VM not found, docker:id found',
function test11(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			t.deepEqual(args, {
				owner_uuid: OWNER_UUID,
				predicate: { eq: [ 'alias', 'webhead3' ] },
				state: 'active',
				fields: 'uuid,alias'
			}, 'args');
			cb(null, []);
			return;
		}

		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			state: 'active',
			fields: 'uuid,alias,internal_metadata,docker'
		}, 'args');
		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			docker: true,
			internal_metadata: { 'docker:id': 'webhead3' }
		} ]);
		return;
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: true
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with ==, VM not found, docker:id not found',
function test12(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			t.deepEqual(args, {
				owner_uuid: OWNER_UUID,
				predicate: { eq: [ 'alias', 'webhead3' ] },
				state: 'active',
				fields: 'uuid,alias'
			}, 'args');
		} else {
			t.deepEqual(args, {
				owner_uuid: OWNER_UUID,
				state: 'active',
				fields: 'uuid,alias,internal_metadata,docker'
			}, 'args');
		}

		cb(null, []);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: 'webhead3',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(filtServers, [], 'servers');
		t.deepEqual(reasons, {
			'*': 'no active containers found matching "webhead3" ' +
				'for affinity "instance==webhead3"'
		}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with reg, VM found',
function test13(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			state: 'active',
			fields: 'uuid,alias,internal_metadata,docker'
		}, 'args');

		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			alias: 'webhead3'
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: '/web/',
		isSoft: false,
		valueType: 're'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: true },
		'locality');
		t.end();
	});
});


test('calculateLocalityHints() with reg, VM not matched',
function test14(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			state: 'active',
			fields: 'uuid,alias,internal_metadata,docker'
		}, 'args');

		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			alias: 'ebhead3'
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: '/web/',
		isSoft: false,
		valueType: 're'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(filtServers, [], 'servers');
		t.deepEqual(reasons, {
			'*': 'no active containers found matching "/web/" for' +
				' affinity "instance==/web/"'
		}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with glob, VM found',
function test15(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: { eq: [ 'alias', 'web*' ] },
			state: 'active',
			fields: 'uuid,alias'
		}, 'args');

		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			alias: 'webhead3'
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: 'web*',
		isSoft: false,
		valueType: 'glob'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: true },
		'locality');
		t.end();
	});
});


test('calculateLocalityHints() with glob, VM not directly matched',
function test16(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			cb(null, []);
			return;
		}

		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			alias: 'webhead3'
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: '*eb*',
		isSoft: false,
		valueType: 'glob'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: true
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() with glob, VM not matched in/directly',
function test17(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		if (args.fields === 'uuid,alias') {
			cb(null, []);
			return;
		}

		cb(null, [ {
			uuid: 'fb02171e-4970-11e9-b315-7f49301411e7',
			alias: 'wbhead3'
		} ]);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: '*eb*',
		isSoft: false,
		valueType: 'glob'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(filtServers, [], 'servers');
		t.deepEqual(reasons, {
			'*': 'no active containers found matching "*eb*" for' +
				' affinity "instance==*eb*"'
		}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() searching with tag, VM found',
function test18(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: {
				or: [ {
					eq: [ 'tag.foo', 'bar' ]
				}, {
					eq: [ 'tag.docker:label:foo', 'bar' ]
				} ]
			},
			state: 'active',
			fields: 'uuid,alias,tags'
		}, 'args');

		cb(null, [ { uuid: 'fb02171e-4970-11e9-b315-7f49301411e7' } ]);
	};

	opts.vm.affinity = [ {
		key: 'foo',
		operator: '==',
		value: 'bar',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ 'fb02171e-4970-11e9-b315-7f49301411e7' ],
			strict: true },
		'locality');
		t.end();
	});
});


test('calculateLocalityHints() searching with tag, VM not found',
function test19(t) {
	var opts = getDefaultOpts(t);

	opts.listVms = function listVms(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			predicate: {
				or: [ {
					eq: [ 'tag.foo', 'bar' ]
				}, {
					eq: [ 'tag.docker:label:foo', 'bar' ]
				} ]
			},
			state: 'active',
			fields: 'uuid,alias,tags'
		}, 'args');

		cb(null, []);
	};

	opts.vm.affinity = [ {
		key: 'foo',
		operator: '==',
		value: 'bar',
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(filtServers, [], 'servers');
		t.deepEqual(reasons, {
			'*': 'no active containers found matching tag ' +
				'"foo=bar" for affinity "foo==bar"'
		}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() searching full Docker id, VM found',
function test20(t) {
	var dockerId = '97ed62d4dc30d1f53b903dac1e90c8fee4a77a30f0099b42f34f6' +
		'7cb5b17019c';

	var opts = getDefaultOpts(t);

	opts.getVm = function getVm(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			uuid: '97ed62d4-dc30-d1f5-3b90-3dac1e90c8fe',
			fields: 'uuid,alias,state,internal_metadata,docker'
		}, 'args');

		cb(null, {
			uuid: '97ed62d4-dc30-d1f5-3b90-3dac1e90c8fe',
			state: 'running',
			docker: true,
			internal_metadata: { 'docker:id': dockerId }
		});
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: dockerId,
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(SERVERS, filtServers, 'servers');
		t.deepEqual(reasons, {}, 'reasons');
		t.deepEqual(opts.vm.locality, {
			near: [ '97ed62d4-dc30-d1f5-3b90-3dac1e90c8fe' ],
			strict: true
		}, 'locality');
		t.end();
	});
});


test('calculateLocalityHints() searching full Docker id, VM not found',
function test21(t) {
	var dockerId = '97ed62d4dc30d1f53b903dac1e90c8fee4a77a30f0099b42f34f6' +
		'7cb5b17019c';

	var opts = getDefaultOpts(t);

	opts.getVm = function getVm(args, extras, cb) {
		t.deepEqual(args, {
			owner_uuid: OWNER_UUID,
			uuid: '97ed62d4-dc30-d1f5-3b90-3dac1e90c8fe',
			fields: 'uuid,alias,state,internal_metadata,docker'
		}, 'args');

		cb(null, null);
	};

	opts.vm.affinity = [ {
		key: 'instance',
		operator: '==',
		value: dockerId,
		isSoft: false,
		valueType: 'exact'
	} ];

	filter.run(SERVERS, opts, function runCb(err, filtServers, reasons) {
		t.ifError(err);
		t.deepEqual(filtServers, [], 'servers');
		t.deepEqual(reasons, {
			'*': 'no active containers found matching "97ed62d4dc' +
				'30d1f53b903dac1e90c8fee4a77a30f0099b42f34f67' +
				'cb5b17019c" for affinity "instance==97ed62d4' +
				'dc30d1f53b903dac1e90c8fee4a77a30f0099b42f34f' +
				'67cb5b17019c"'
		}, 'reasons');
		t.deepEqual(opts.vm.locality, undefined, 'locality');
		t.end();
	});
});


test('name', function (t) {
	t.equal(typeof (filter.name), 'string');
	t.end();
});
