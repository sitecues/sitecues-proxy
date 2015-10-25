'use strict';

const alignJson = require('json-align'),   // JSON prettifier
      readPkgUp = require('read-pkg-up'),  // find + parse package.json
      pkg       = readPkgUp.sync(),
      APP_NAME  = pkg.name,
      VERSION   = pkg.version;

function onStatusRequest(request, response, cycle) {

    // This function runs when /status is visited.
    // You can use it for heartbeat checks.

    response.headers['Content-Type'] = 'application/json';

    response.string = alignJson({
            app        : APP_NAME,
            version    : VERSION,
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
}

module.exports = onStatusRequest;
