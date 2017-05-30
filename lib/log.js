// Helper module for routing messages. For example, to help debug a feature.

'use strict';

const { Logger, transports } = require('winston');

// Configure the logger instance.
const config = {
    levels : {
        error   : 0,
        warn    : 1,
        info    : 2,
        verbose : 3,
        debug   : 4,
        silly   : 5
    },
    colors : {
        error   : 'red',
        warn    : 'yellow',
        info    : 'green',
        verbose : 'cyan',
        debug   : 'blue',
        silly   : 'magenta'
    },
    // Where we send log entries.
    transports : [
        new transports.Console({
            level     : 'info',
            showLevel : true,
            timestamp : true,
            colorize  : true
        })
    ]
};

module.exports = new Logger(config);
