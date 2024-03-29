#!/usr/bin/env node

// The CLI for the Proxy.

// TODO: Investigate whether hoxy can support us using port-drop.

'use strict';

// Crash and burn, die fast if a rejected promise is not caught.
require('throw-rejects')();

const chalk = require('chalk');
const open = require('opn');
const rootCheck = require('root-check');
const handleQuit = require('handle-quit');
const cli = require('meow')(`
    Usage
      $ proxy

    Option
      --port <number>            Listen on a custom port for requests.
      --open <url>               Open a URL in your browser.
      --loader <string>          Code to inject into HTML responses.
      --loaderFile <path>        Filepath to find a loader.
      --loaderStrategy <string>  What to do with loaders.
      --logLevel <level>         Amount of program info to output.

    Example
      $ proxy
      The Sitecues® Proxy is on port 8000.
      $ proxy --port=8888
      The Sitecues® Proxy is on port 8888.
`);

const PageProxy = require('../');
const { SecurityError } = require('../lib/error');
const log = require('../lib/log');

const { logLevel } = cli.flags;
if (logLevel && typeof logLevel === 'string') {
    log.transports.console.level = logLevel;
}

// This function is designed to modify a URL such that its protocol
// is http: if one is not already present.
const assumeHttp = (inputUrl) => {
    return inputUrl.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');
};

const serverOptions = Object.assign({}, cli.flags);
delete serverOptions.target;
delete serverOptions.open;

const server = new PageProxy(serverOptions);

handleQuit(() => {
    server.stop();
    // TODO: Properly fix Hoxy's shenanigans. https://github.com/greim/hoxy/issues/88
    const hack = setTimeout(
        () => {
            process.exit(0);
        },
        600
    );
    hack.unref();
});

server.start().then(() => {
    // Attempt to set UID to a normal user now that we definitely
    // do not need elevated privileges.
    rootCheck(
        chalk.red.bold('I died trying to save you from yourself.\n') +
        (new SecurityError('Unable to let go of root privileges.')).stack
    );

    const { state } = server;

    log.info(`The Sitecues\u00AE Proxy is on port ${state.port}.`);

    const target = cli.flags.open;

    if (target) {
        const visitUrl = assumeHttp(target === true ? 'tired.com' : target);
        open(visitUrl);
    }
});
