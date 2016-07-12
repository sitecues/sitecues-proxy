'use strict';

const fs = require('fs');
const path = require('path');
const { Server } = require('hapi');

class ReverseProxy extends Server {

    constructor(option) {
        option = Object.assign(
            {
                port : 8001,
                tls : {
                    key  : fs.readFileSync(path.join(__dirname, 'ssl/key/localhost.key')),
                    cert : fs.readFileSync(path.join(__dirname, 'ssl/cert/localhost.cert'))
                }
            },
            option
        );

        super();
        super.connection({
            port : option.port,
            tls  : option.tls
        });
    }

    start() {
        return super.register(require('h2o2')).then(() => {
            super.route([
                require('./route/status'),
                require('./route/target'),
                require('./route/stream-target')
            ]);

            // Sadly, we cannot just return the start() promise because of:
            // https://github.com/hapijs/hapi/issues/3217

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
