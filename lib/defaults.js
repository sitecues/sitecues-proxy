'use strict';

var direction = 'forward',
    defaultPorts = {
        forward : 8000
    };

defaultPorts.reverse = defaultPorts.forward + 1;

module.exports = {
    direction,
    defaultPorts
};
