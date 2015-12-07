#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

'use strict';

// Use the main module in the package.json manifest to get a hold of the API.
const
    sitecuesProxy = require('../'),
    server = sitecuesProxy.createServer(),
    log = require('../lib/log');

// Crash and burn, die fast if a rejected promise is not caught.
process.on('unhandledRejection', function (reason) {
    throw reason;
});

server.listen()
    .then(function (server) {

        const state = server.state;

        let message = 'The sitecues\u00AE';

        if (state.reverseMode) {
            message += ' reverse';
        }
        message += ' proxy is on port ' + state.port + '.';

        log.info(message);
    });
