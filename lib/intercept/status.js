'use strict';

const alignJson = require('json-align');
const { pkg } = require('read-pkg-up').sync({ cwd : __dirname });

const appName = pkg.name;
const appVersion = pkg.version;

// This function runs when /status is visited. You can use it
// for heartbeat checks.
const onStatusRequest = (request, response) => {
    // Repair the mess caused by the fact that "status" is not an absolute URL.
    // The general request handler will have converted the response into a
    // redirect because of that. But status is an exception to the rule.
    response.statusCode = 200;
    delete response.headers.location;

    response.headers['Content-Type'] = 'application/json';

    response.string = alignJson({
        app        : appName,
        version    : appVersion,
        status     : 'OK',
        statusCode : 200,
        time       : (new Date()).toISOString(),
        process    : {
            title   : process.title,
            version : process.version,
            pid     : process.pid,
            uptime  : process.uptime()
        }
    });
};

module.exports = onStatusRequest;
