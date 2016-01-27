#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

'use strict';

// Use the main module in the package.json manifest to get a hold of the API.
const
    server = require('../').createServer(),
    chalk = require('chalk'),
    rootCheck = require('root-check'),
    SecurityError = require('../lib/error').SecurityError,
    log = require('../lib/log');

// Crash and burn, die fast if a rejected promise is not caught.
process.on('unhandledRejection', function (err) {
    throw err;
});

server.init()
    .then(function () {
        return server.listen();
    })
    .then(function (server) {
        // Attempt to set UID to a normal user now that we definitely
        // do not need elevated privileges.
        rootCheck(
            chalk.red.bold('I died trying to save you from yourself.\n') +
            (new SecurityError('Failed to let go of root privileges.')).stack
        );

        const state = server.state;

        let message = 'The sitecues\u00AE';

        if (state.reverseMode) {
            message += ' reverse';
        }
        message += ` proxy is on port ${state.port}.`;

        log.info(message);
    });
