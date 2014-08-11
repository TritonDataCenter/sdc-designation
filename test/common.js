/*
 * Copyright 2014 Joyent, Inc.  All rights reserved.
 */

var mod_fs = require('fs');

module.exports = JSON.parse(mod_fs.readFileSync(__dirname + '/common.json'));
