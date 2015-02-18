var lib = require('./lib');

function start(options) {
    var defaultPorts = {},
        options = {};

    defaultPorts.forward = 8000;
    defaultPorts.reverse = defaultPorts.forward + 1;

    // TODO: Have the context path be the root of all proxy functionality, not just the page API.

    options.contextPath = process.env.SITECUES_PROXY_CONTEXT_PATH || process.env.PROXY_CONTEXT_PATH || process.env.CONTEXT_PATH || '/foo/';
    options.hostname    = process.env.SITECUES_PROXY_HOSTNAME  || process.env.PROXY_HOSTNAME  || process.env.HOSTNAME  || '127.0.0.1';
    options.direction   = process.env.SITECUES_PROXY_DIRECTION || process.env.PROXY_DIRECTION || process.env.DIRECTION || 'forward';
    options.port        = process.env.SITECUES_PROXY_PORT      || process.env.PROXY_PORT      || process.env.PORT      || defaultPorts[options.direction.trim().toLowerCase()];
    options.target      = process.env.SITECUES_PROXY_TARGET    || process.env.PROXY_TARGET    || process.env.TARGET    || 'http://www.example.com';
    options.verbose     = process.env.SITECUES_PROXY_VERBOSE   || process.env.PROXY_VERBOSE   || process.env.VERBOSE   || false,

    lib.start(options);
}

module.exports = {
    start : start,
    stop  : lib.stop
};
