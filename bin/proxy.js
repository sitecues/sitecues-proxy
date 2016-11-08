#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

'use strict';

// Crash and burn, die fast if a rejected promise is not caught.
require('throw-rejects')();

const chalk = require('chalk');
const handleQuit = require('handle-quit');
const rootCheck = require('root-check');
const server = require('../').createServer();
const { SecurityError } = require('../lib/error');
const log = require('../lib/log');

handleQuit(() => {
    server.stop();
});

server.init()
    .then(() => {
        return server.start();
    })
    .then(() => {
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
