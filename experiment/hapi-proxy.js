'use strict';

process.on('unhandledRejection', (err) => {
    throw err;
});

const
    isRelativeUrl = require('url-type').isRelative,
    hapi = require('hapi'),
    cheerio = require('cheerio'),
    server = new hapi.Server(),
    Trumpet = require('trumpet'),
    wreck = require('wreck');

// TODO: Use require-dir for cleaner importing of routes.
const route = {
    status : require('./route/status'),
    streamTarget : require('./route/stream-target'),
    target : require('./route/target')
}

server.connection({ port : 8001 });

server.route(route.status);

server.register(
    {
        register : require('h2o2')
    },
    function (err) {

        if (err) {
            throw err;
        }

        server.route(route.streamTarget);

        server.route(route.target);

        server.start(function (err) {
            if (err) {
                throw err;
            }
            console.log('Reverse proxy available at:', server.info.uri);
        });
    }
);
