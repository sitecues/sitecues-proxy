// Default configuration for proxy systems. Note that not all of these pieces
// are used verbatim. For example, the proxy takes a single numeric value for
// its "port" option. Here it is an object with fields for each direction, so
// that starting a forward and reverse proxy back-to-back can be made more
// user friendly, without conflicts, by having a dynamic default.

'use strict';

const
    path = require('path'),
    port = {
        forward : 8000
    };

port.reverse = port.forward + 1;

module.exports = {
    direction : 'forward',
    scheme    : 'http',
    hostname  : 'localhost',
    port,
    target      : 'http://www.example.com',
    proxyLinks  : true,
    proxyBase   : true,
    contextPath : '/',
    route : {
        // Where to send heartbeat checks.
        status : 'status',
        // Where to input target pages for reverse proxying.
        page   : 'page'
    },
    loaderFile : path.join('config', 'loader.html')
};
