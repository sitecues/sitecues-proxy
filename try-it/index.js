'use strict';

process.on('unhandledRejection', (err) => {
    throw err;
});

const
    hapi = require('hapi'),
    server = new hapi.Server();

server.connection({ port : 8001 });

server.register(
    require('h2o2'),
    (err) => {

        if (err) {
            throw err;
        }

        // TODO: Import all from directory, like require-dir.
        server.route([
            require('./route/status'),
            require('./route/target'),
            require('./route/stream-target')
        ]);

        server.start((err) => {

            if (err) {
                throw err;
            }

            console.log('Reverse proxy available at:', server.info.uri);
        });
    }
);
