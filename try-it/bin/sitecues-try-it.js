#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

'use strict';

const
    server = require('../').createServer(),
    chalk = require('chalk'),
    rootCheck = require('root-check'),
    SecurityError = require('../lib/error').SecurityError,
    log = require('../lib/log');

// Crash and burn, die fast if a rejected promise is not caught.
require('throw-rejects/register');

let cancelled = false;

process.on('SIGINT', () => {

    if (cancelled) {
        console.warn('\nShutting down immediately. You monster!');
        process.exit(1);
    }

    cancelled = true;

    console.warn('\nShutting down. Please wait or hit CTRL+C to force quit.');

    server.stop();
});

server.init().then(() => {
        return server.start();
    })
    .then((server) => {
        // Attempt to set UID to a normal user now that we definitely
        // do not need elevated privileges.
        rootCheck(
            chalk.red.bold('I died trying to save you from yourself.\n') +
            (new SecurityError('Unable to let go of root privileges.')).stack
        );

        const state = server.state;

        let message = 'The sitecues\u00AE';

        if (state.reverseMode) {
            message += ' reverse';
        }
        message += ` proxy is on port ${state.port}.`;

        log.info(message);
    });
