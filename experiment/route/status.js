'use strict';

const
    alignJson = require('json-align'),
    pkg = require('read-pkg-up').sync().pkg,  // find + parse package.json
    APP_NAME = pkg.name,
    VERSION  = pkg.version;

module.exports = {
    method : 'GET',
    path   : '/sitecuesProxyStatus',
    handler : function (request, reply) {

        const status = {
            app        : APP_NAME,
            version    : VERSION,
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