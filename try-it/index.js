'use strict';

const {Server} = require('hapi');

class ReverseProxy extends Server {

    constructor(option) {

        option = Object.assign({ port : 8001 }, option);

        super();
        super.connection({ port : option.port });
    }

    start() {
        return super.register(require('h2o2')).then(() => {

            // TODO: Import all from directory, like require-dir.
            super.route([
                require('./route/status'),
                require('./route/target'),
                require('./route/stream-target')
            ]);

            // TODO: Simply return the promise once hapijs/hapi#3217 is resolved.
            // https://github.com/hapijs/hapi/issues/3217

            // return super.start();

            return new Promise((resolve, reject) => {
                super.start((err) => {

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    }
}

module.exports = {
    ReverseProxy
};
