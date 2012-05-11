/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */

var assert = require('assert');



/*
 * Simple randNumber to choose a random server from the list
 */
function randNumber(limit) {
  return Math.floor(Math.random() * limit);
}



function random(servers) {
  return servers[randNumber(servers.length)];
}



function mostAvailableRam(servers) {
    var maxRam = -1;
    var maxIndex = -1;
    var i;

    for (i = 0; i < servers.length; i++) {
        if (servers[i].memoryavailablebytes > maxRam) {
            maxRam = servers[i].memoryavailablebytes;
            maxIndex = i;
        }
    }

    return servers[maxIndex];
}



module.exports = {

    random: random,
    mostAvailableRam: mostAvailableRam

};
