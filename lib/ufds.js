/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * High level UFDS wrapper
 */

var UFDS = require('sdc-clients').UFDS;
var EventEmitter = require('events').EventEmitter;
var util = require('util');


function Ufds(options) {
  this.connection = new UFDS(options);
  // this.connection.setLogLevel(options.logLevel);

  EventEmitter.call(this);

  var self = this;

  this.connection.on('ready', function () {
    self.emit('ready');
  });

  this.connection.on('error', function (err) {
    self.emit('error', err);
  });
}

util.inherits(Ufds, EventEmitter);



Ufds.prototype.search = function (base, options, callback) {
  return this.connection.search(base, options, callback);
};



Ufds.prototype.add = function (dn, entry, callback) {
  return this.connection.add(dn, entry, callback);
};



Ufds.prototype.del = function (dn, callback) {
  return this.connection.del(dn, callback);
};


module.exports = Ufds;
