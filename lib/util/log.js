var winston = require('winston'),
    transports,
    log;

// Where we send log entries.
transports = [
    new winston.transports.Console(
        {
            timestamp : true,
            colorize  : true
            // level     : 'verbose'
        }
    )
    // new winston.transports.File(
    //     {
    //         filename  : './log/sitecues-proxy.log',
    //         maxsize   : 15000000,         // measured in bytes
    //         maxFiles  : 3,
    //         timestamp : true
    //     }
    // )
];

// Make a new logging interface to manage entries.
log = new winston.Logger(
    {
        transports: transports
    }
);

log.ok = function () {
    this.info.apply(this, arguments);
};

module.exports = log;
