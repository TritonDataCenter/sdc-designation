/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * An identity function; returns the same servers it received.
 */



function identity(log, state, servers) {
    return servers;
}



module.exports = {
    name: 'Identity function',
    run: identity
};
