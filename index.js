//
// This is the main entry point for this application.
// At the moment, it serves as a config manager.
//

var defaultPorts = require('./lib/default-ports'),
    lib          = require('./lib');

function start(options) {

    if (!options || typeof options !== 'object') {
        options = {};
    }

    // Context path must begin and end with a slash '/'
    // TODO: DRY up the slashes. Make robust helpers to compute proxy paths.
    options.contextPath = options.contextPath || process.env.SITECUES_PROXY_CONTEXT_PATH || process.env.PROXY_CONTEXT_PATH || process.env.CONTEXT_PATH || '/';
    options.hostname    = options.hostname    || process.env.SITECUES_PROXY_HOSTNAME     || process.env.PROXY_HOSTNAME     || process.env.HOSTNAME     || 'localhost';
    options.direction   = options.direction   || process.env.SITECUES_PROXY_DIRECTION    || process.env.PROXY_DIRECTION    || process.env.DIRECTION    || 'forward';
    options.port        = options.port        || process.env.SITECUES_PROXY_PORT         || process.env.PROXY_PORT         || process.env.PORT         || defaultPorts[options.direction.trim().toLowerCase()];
    options.target      = options.target      || process.env.SITECUES_PROXY_TARGET       || process.env.PROXY_TARGET       || process.env.TARGET       || 'http://www.example.com';
    options.proxyLinks  = options.proxyLinks  || process.env.SITECUES_PROXY_LINKS        || process.env.PROXY_LINKS        || process.env.LINKS        || false;
    options.verbose     = options.verbose     || process.env.SITECUES_PROXY_VERBOSE      || process.env.PROXY_VERBOSE      || process.env.VERBOSE      || false;

    lib.start(options);
}

module.exports = {
    start : start,
    stop  : lib.stop
};
