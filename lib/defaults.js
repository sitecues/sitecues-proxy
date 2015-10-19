'use strict';

const port = {
          forward : 8000
      };

port.reverse = port.forward + 1;

module.exports = {
    direction : 'forward',
    hostname  : 'localhost',
    port,
    target      : 'http://www.example.com',
    proxyLinks  : false,
    contextPath : '/'
    route : {
        // Where to send heartbeat checks.
        status : 'status',
        // Where to input target pages for reverse proxying.
        page   : 'page'
    }
};
