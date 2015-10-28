// This is the main entry point for the sitecues proxy.

'use strict';

const FriendlyServer = require('./lib/FriendlyServer');

// The sitecues proxy is actually a FriendlyServer factory.
function sitecuesProxy(options) {
    return new FriendlyServer(options);
}

// Conventionally, Node server APIs have a factory named like this, so we
// provide this alias to be more friendly and familiar.
sitecuesProxy.createServer = sitecuesProxy;
// As far as the outside world is concerned, there's only one kind of server,
// which happens to be a friendly server.
sitecuesProxy.Server       = FriendlyServer;

// Public API.
module.exports = sitecuesProxy;
