#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

'use strict';

// Use the main module in the package.json manifest to get a hold of the API.
const sitecuesProxy = require('../'),
      server = sitecuesProxy.createServer(),
      log = require('../lib/log');

let message = 'The sitecues\u00AE';

server.listen()
    .then(function (server) {

        const state = server.state;

        if (state.reverseMode) {
            message += ' reverse';
        }
        message += ' proxy is on port ' + state.port + '.';

        log.info(message);
    });
