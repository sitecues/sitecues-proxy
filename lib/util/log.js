'use strict';

var winston      = require('winston'),
    path         = require('path'),
    mkdirp       = require('mkdirp'),
    logDirectory = path.resolve(__dirname, '../../log'),
    logFile      = path.resolve(logDirectory, 'sitecues-proxy.log'),
    config,
    key;

// TODO: Don't make assumptions about free disk space or that we can even
//       write to a disk at all. Make file logs an opt-in configuration.

// Make sure the log directory exists, so we can write to it.
mkdirp.sync(
    logDirectory,
    {
        mode : parseInt('0740', 8)
    }
);

// Configure the winston instance we will use for logging.
config = {
    levels : {
        silly   : 0,
        debug   : 1,
        verbose : 2,
        info    : 3,
        warn    : 4,
        error   : 5
    },
    colors : {
        silly   : 'magenta',
        debug   : 'blue',
        verbose : 'cyan',
        info    : 'green',
        warn    : 'yellow',
        error   : 'red'
    },
    // Where we send log entries.
    transports : [
        new winston.transports.Console(
            {
                level     : 'info',
                showLevel : true,
                timestamp : true,
                colorize  : true
            }
        ),
        new winston.transports.File(
            {
                level     : 'info',
                showLevel : true,
                timestamp : true,
                colorize  : false,
                filename  : logFile,
                tailable  : true,     // newest logs in lower numbered log files
                maxsize   : 800000,   // measured in bytes
                maxFiles  : 3
            }
        )
    ]
};

function log() {
    log.info.apply(log, arguments);
}

// Make log behave like an instantiated Logger singleton.

// Add the properties that would be inherited.
// TODO: FIgure out why the JSHint numeric id syntax
//       isn't working here, since that's considered
//       better practice: +W089
/*jshint forin: true */
for (key in winston.Logger.prototype) {
    log[key] = winston.Logger.prototype[key];
}
/*jshint forin: false */

// Add the per-instance properties.
winston.Logger.call(
    log,
    config
);

module.exports = log;
