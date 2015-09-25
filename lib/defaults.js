'use strict';

var direction = 'forward',
    route = {
        // Where to send heartbeat checks.
        status : 'status',
        // Where to input target pages for reverse proxying.
        page   : 'page'
    },
    ports = {
        forward : 8000
    };

ports.reverse = ports.forward + 1;

module.exports = {
    direction,
    ports
};
