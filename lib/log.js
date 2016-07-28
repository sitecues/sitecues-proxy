// Helper module for routing messages. For example, to help debug a feature.

'use strict';

const path = require('path');
const mkdirp = require('mkdirp');
const { Logger, transports } = require('winston');
const logDir = path.join(require('pkg-dir').sync(__dirname), 'log');

const logPath = path.join(logDir, 'sitecues-proxy.log');

// Make sure the log directory exists, so we can write to it.
mkdirp.sync(logDir, {
    mode : 0o0740
});

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
            level     : 'verbose',
            showLevel : true,
            timestamp : true,
            colorize  : true
        }),
        new transports.File({
            level     : 'info',
            showLevel : true,
            timestamp : true,
            colorize  : false,
            filename  : logPath,
            tailable  : true,
            maxsize   : 4096,
            maxFiles  : 3
        })
    ]
};

module.exports = new Logger(config);
