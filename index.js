//
// This is the main entry point for the sitecues proxy.
// It is a thin wrapper around the main library and is
// responsible for setting defaults, so t serves as a config manager.
//

'use strict';

var defaultPorts = require('./lib/default-ports'),
    lib          = require('./lib'),
    util         = require('./lib/util').general;

function Server(options) {

    // This is a thin wrapper around the main library's Server.
    // It is responsible for sanitizing configuration, so that
    // the main library can make more assumptions, and also so
    // that this logic can be bypassed easily by using the
    // main library directly, if you have a weird use case.

    // Object.create is not happy with things like booleans, so override those.
    if (typeof options !== 'object' && typeof options !== 'function') {
        options = Object.prototype;
    }
    // Make sure that we don't edit an object that does not belong to us.
    options = Object.create(options);

    options.direction   = options.direction   || process.env.SITECUES_PROXY_DIRECTION    || process.env.PROXY_DIRECTION    || process.env.DIRECTION    || 'forward';
    options.hostname    = options.hostname    || process.env.SITECUES_PROXY_HOSTNAME     || process.env.PROXY_HOSTNAME     || process.env.HOSTNAME     || 'localhost';
    options.port        = options.port        || process.env.SITECUES_PROXY_PORT         || process.env.PROXY_PORT         || process.env.PORT         || defaultPorts[options.direction.trim().toLowerCase()];
    options.target      = options.target      || process.env.SITECUES_PROXY_TARGET       || process.env.PROXY_TARGET       || process.env.TARGET       || 'http://www.example.com';
    // NOTE: Currently, the context path must begin and end with a slash '/'
    options.contextPath = options.contextPath || process.env.SITECUES_PROXY_CONTEXT_PATH || process.env.PROXY_CONTEXT_PATH || process.env.CONTEXT_PATH || '/';
    // whether to convert page links to proxy links.
    options.proxyLinks  = options.proxyLinks  || process.env.SITECUES_PROXY_LINKS        || process.env.PROXY_LINKS        || process.env.LINKS        || false;
    options.verbose     = options.verbose     || process.env.SITECUES_PROXY_VERBOSE      || process.env.PROXY_VERBOSE      || process.env.VERBOSE      || false;

    options.branch      = options.branch      || process.env.SITECUES_PROXY_BRANCH       || process.env.PROXY_BRANCH       || process.env.BRANCH       || false;
    options.siteId      = options.siteId      || process.env.SITECUES_PROXY_SITE_ID      || process.env.PROXY_SITE_ID      || process.env.SITE_ID      || 's-00000005';
    options.devVersion  = options.devVersion  || process.env.SITECUES_PROXY_DEV_VERSION  || process.env.PROXY_DEV_VERSION  || process.env.DEV_VERSION  || false;
    options.release     = options.release     || process.env.SITECUES_PROXY_RELEASE      || process.env.PROXY_RELEASE      || process.env.RELEASE      || false;
    options.production  = options.production  || process.env.SITECUES_PROXY_PRODUCTION   || process.env.PROXY_PRODUCTION   || process.env.PRODUCTION   || false;
    options.ipAddress   = options.ipAddress   || process.env.SITECUES_PROXY_IP_ADDRESS   || process.env.PROXY_IP_ADDRESS   || process.env.IP_ADDRESS   || false;

    options.loader      = options.loader      || process.env.SITECUES_PROXY_LOADER       || process.env.PROXY_LOADER       || process.env.LOADER;

    // // NOT IMPLEMENTED. Take a filepath to find a loader, if one is not provided. Maybe we'll use a wathcer like Chokidar, too.
    // options.loaderPath  = options.loaderPath  || process.env.SITECUES_PROXY_LOADER_PATH  || process.env.PROXY_LOADER_PATH  || process.env.LOADER_PATH;
    // // NOT IMPLEMENTED. Take an object to dynamically construct a loader, if one is not provided.
    // options.loaderOptions = options.loaderOptions || process.env.SITECUES_PROXY_LOADER_OPTIONS || process.env.PROXY_LOADER_OPTIONS || process.env.LOADER_OPTIONS;

    // if (typeof options.loader === 'undefined' || options.loader === true) {
    //     options.loadScript = util.createLoader();
    // }

    // Delegate to the main library for all of the hard work
    // of actually setting up a server.
    lib.Server.call(this, options);
}
// Instances inherit the same properties as those from the main library's Server.
Server.prototype = Object.create(lib.Server.prototype);
// Make sure instances inherit a correct reference to their constructor.
// If we don't, this will be the main library's Server.
Server.prototype.constructor = Server;

function sitecuesProxy(options) {
    return new Server(options);
}

// Conventionally, Node server APIs have a method like this, so we
// provide this alias to be more friendly and familiar.
sitecuesProxy.createServer = sitecuesProxy;
sitecuesProxy.Server       = Server;

module.exports = sitecuesProxy;
