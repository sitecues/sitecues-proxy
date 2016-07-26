// Helper module for routing messages. For example, to help debug a feature.

'use strict';

const path    = require('path');
const mkdirp  = require('mkdirp');
const winston = require('winston');
const logDir  = path.resolve(require('pkg-dir').sync(__dirname), 'log');

const logPath = path.join(logDir, 'sitecues-proxy.log');

// TODO: Don't make assumptions about free disk space or that we can even
//       write to a disk at all. Make file logs an opt-in configuration.

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
        new winston.transports.Console({
            level     : 'verbose',
            showLevel : true,
            timestamp : true,
            colorize  : true
        }),
        new winston.transports.File({
            level     : 'info',
            showLevel : true,
            timestamp : true,
            colorize  : false,
            filename  : logPath,
            tailable  : true,     // newest logs in lower numbered log files
            maxsize   : 4096,     // measured in bytes
            maxFiles  : 3
        })
    ]
};

module.exports = new winston.Logger(config);
