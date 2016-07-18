#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

// TODO: Use port-drop when it becomes viable.
// https://github.com/hapijs/hapi/issues/3204

'use strict';

// Crash and burn, die fast if a rejected promise is not caught.
require('throw-rejects/register');

const chalk = require('chalk');
const open = require('opn');
const assumeHttp = require('prepend-http');
const rootCheck = require('root-check');
const cli = require('meow')(`
    Usage
      $ sitecues-try-it

    Options
      --port    Listen on a specific port for requests
      --target  Copy a demo link and open it in a browser

    Examples
      $ sitecues-try-it --port=7000
      ${chalk.bold.cyan('Try Sitecues')} ${chalk.bold.grey('at')} ${chalk.bold.yellow('http://localhost:7000')}
      $ sitecues-try-it --target 'http://tired.com'
      ${chalk.bold.cyan('Try Sitecues')} ${chalk.bold.grey('at')} ${chalk.bold.yellow('http://localhost:3000/http://tired.com')}
`);

const { ReverseProxy } = require('../');
const { SecurityError } = require('../../lib/error');

const serverOptions = Object.assign({}, cli.flags);
delete serverOptions.target;

const server = new ReverseProxy(serverOptions);

let cancelled = false;

process.on('SIGINT', () => {
    if (cancelled) {
        console.warn('\nShutting down immediately. You monster!');
        // Quit and tell the shell something went wrong.
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }

    cancelled = true;

    console.warn('\nShutting down. Please wait or hit CTRL+C to force quit.');

    server.stop();
});

server.start().then(() => {
    // Attempt to set UID to a normal user now that we definitely
    // do not need elevated privileges.
    rootCheck(
        chalk.red.bold('I died trying to save you from yourself.\n') +
        (new SecurityError('Unable to let go of root privileges.')).stack
    );

    const { target } = cli.flags;
    const visitUrl = server.info.uri + '/' + (target ? assumeHttp(target) : '');

    console.log(
        chalk.bold.cyan('Try Sitecues'),
        chalk.bold.grey('at'),
        chalk.bold.yellow(visitUrl)
    );

    if (target) {
        open(visitUrl);
    }
});
