'use strict';

const alignJson = require('json-align');
const { pkg } = require('read-pkg-up').sync({ cwd : __dirname });

const appName = pkg.name;
const appVersion = pkg.version;

module.exports = {
    method : 'GET',
    path   : `/__${appName}/status`,
    handler(request, reply) {
        const status = {
            app        : appName,
            version    : appVersion,
            statusCode : 200,
            status     : 'OK',
            time       : (new Date()).toISOString(),
            process    : {
                title   : process.title,
                version : process.version,
                pid     : process.pid,
                uptime  : process.uptime()
            }
        };

        reply(alignJson(status))
        // Inform Hapi that our string is actually valid JSON.
        .type('application/json');
    }
};
