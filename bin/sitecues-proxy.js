#!/usr/bin/env node

// The command line interface for the sitecues Proxy.

'use strict';

// Use the main module in the package.json manifest to get a hold of the API.
const sitecuesProxy = require('../'),
      server = sitecuesProxy.createServer();

server.listen();
