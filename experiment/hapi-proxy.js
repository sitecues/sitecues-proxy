'use strict';

process.on('unhandledRejection', (err) => {
    throw err;
});

const
    hapi = require('hapi'),
    server = new hapi.Server(),
    // TODO: Use require-dir for cleaner importing of routes.
    route = {
        status : require('./route/status'),
        target : require('./route/target'),
        streamTarget : require('./route/stream-target')
    };

server.connection({ port : 8001 });

server.route(route.status);

server.register(
    {
        register : require('h2o2')
    },
    (err) => {

        if (err) {
            throw err;
        }

        server.route(route.target);

        server.route(route.streamTarget);

        server.start((err) => {

            if (err) {
                throw err;
            }

            console.log('Reverse proxy available at:', server.info.uri);
        });
    }
);
