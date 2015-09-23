#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

// Use the main module in the package.json manifest to get a hold of the API.
var sitecuesProxy = require('../'),
    server;

server = sitecuesProxy.createServer();

server.listen();
