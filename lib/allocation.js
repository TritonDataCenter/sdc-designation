/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 *
 * A brief overview of this source file: what is its purpose.
 */



/*
 * Allocates a server
 */
function allocate(req, res, next) {
  res.send('Hello');
  return next();
}



/*
 * Mounts allocation endpoints
 */
function mount(server, before) {
  server.get({path: '/allocation', name: 'ListEggs'}, before, allocate);
}


// --- Exports

module.exports = {
   mount: mount
};