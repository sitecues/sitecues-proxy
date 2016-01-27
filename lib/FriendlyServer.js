// Friendly servers are servers whose APIs are easier to use, because they
// parse or otherwise compute input in more flexible ways. They are a
// modular layer of defensive programming.

'use strict';

const
    staticDefault = require('./defaults'),
    dangit        = require('dangit'),
    Server        = require('./Server'),
    util          = require('./util').general,
    portType      = require('port-type'),
    // NOTE: Port 0 is a special case. It means "give me a random port".
    MIN_PORT = 0,
    MAX_PORT = 65535;

// To be considered valid, the port number has to exactly equal the min or max,
// otherwise it must be between them. This fun algorithm avoids bad times like
// '' >= 0 being true, because that uses a loose equality comparison.
function isValidPortNumber(port) {
    return port === MIN_PORT ||
           port === MAX_PORT ||
           (MIN_PORT < port && port < MAX_PORT);
}

function assertValidPortNumber(portInt, originalInput) {
    if (!isValidPortNumber(portInt)) {
        throw new RangeError(
                `${originalInput} is not a valid port number of ${MIN_PORT} - ${MAX_PORT}.`
            );
    }
}


// This is a thin wrapper around the main library's Server. It is responsible
// for sanitizing and permuting configuration so that code can be simpler and
// make more assumptions, As a bonus, this logic can be bypassed easily by
// using the main library directly, if you have a weird use case.
class FriendlyServer extends Server {

    constructor(options) {

        const
            perCallDefault = {
                direction   : process.env.DIRECTION,
                scheme      : process.env.SCHEME,
                hostname    : process.env.HOSTNAME,
                port        : process.env.PORT,
                target      : process.env.TARGET,
                // Whether to convert page links to proxy links.
                proxyLinks  : process.env.LINKS,
                // NOTE: Currently, the context path must begin and end with a slash '/'
                contextPath : process.env.CONTEXT_PATH,
                loader      : process.env.LOADER,
                loaderFile  : process.env.LOADER_FILE,
                loaderStrategy : process.env.LOADER_STRATEGY
            },
            // NOTE: Port is intentionally absent from this list, as it needs
            //       to be determined dynamically based on direction.
            safeDefault = {
                direction   : perCallDefault.direction   || staticDefault.direction,
                scheme      : perCallDefault.scheme      || staticDefault.scheme,
                hostname    : perCallDefault.hostname    || staticDefault.hostname,
                target      : perCallDefault.target      || staticDefault.target,
                proxyLinks  : perCallDefault.proxyLinks  || staticDefault.proxyLinks,
                contextPath : perCallDefault.contextPath || staticDefault.contextPath,
                loader      : perCallDefault.loader,
                loaderFile  : perCallDefault.loaderFile  || staticDefault.loaderFile,
                loaderStrategy : perCallDefault.loaderStrategy
            };

        // Settings for the server delegate to the input, so that we don't
        // accidentally overwrite values on an object that belongs to the
        // outside world.
        // Defensive: Object.create throws an error when given undefined (etc.) so
        // we only use it if given reasonable input to delegate to.
        options = dangit.isExtendableType(options) ?
                      Object.create(options)       :
                      {};

        // Mode of operation for the proxy. Whether it should act as a blanket for
        // all computer traffic or pretend to be a website.
        if (options.direction && typeof options.direction === 'string') {
            options.direction = options.direction.trim().toLowerCase();
            if (!options.direction) {
                options.direction = safeDefault.direction;
            }
        }
        else {
            options.direction = safeDefault.direction;
        }


        if (options.scheme && typeof options.scheme === 'string') {
            options.scheme = options.scheme.trim().toLowerCase();
            if (!options.scheme) {
                options.scheme = safeDefault.scheme;
            }
        }
        else {
            options.scheme = safeDefault.scheme;
        }


        // Domain or IP the proxy should re-write page links to use.
        if (options.hostname && typeof options.hostname === 'string') {
            options.hostname = options.hostname.trim().toLowerCase();
            if (!options.hostname) {
                options.hostname = safeDefault.hostname;
            }
        }
        else {
            options.hostname = safeDefault.hostname;
        }


        // Which port the proxy should listen on, assuming the user does not
        // override it when using .listen()
        if (typeof options.port === 'string') {
            options.port = options.port.trim().toLowerCase();
        }
        if (options.port !== 'auto') {
            const portInt = Math.round(parseFloat(options.port));
            if (Number.isNaN(portInt)) {
                options.port = perCallDefault.port || staticDefault.port[options.direction];
            }
            else {
                assertValidPortNumber(portInt, options.port);
                options.port = portInt;
            }
        }


        if (options.target && typeof options.target === 'string') {
            options.target = options.target.trim();
            if (!options.target) {
                options.target = safeDefault.target;
            }
        }
        else {
            options.target = safeDefault.target;
        }


        // Whether to convert page links to proxy links.
        options.proxyLinks = Boolean(options.proxyLinks || safeDefault.proxyLinks);


        // NOTE: Currently, the context path must begin and end with a slash '/'
        if (options.contextPath && typeof options.contextPath === 'string') {
            options.contextPath = options.contextPath.trim().toLowerCase();
            if (!options.contextPath) {
                options.contextPath = safeDefault.contextPath;
            }
        }
        else {
            options.contextPath = safeDefault.contextPath;
        }

        // Special behavior for non-object-like input.
        if (!dangit.isExtendableType(options.route)) {
            options.route = staticDefault.route;
        }

        if (options.loaderFile && typeof options.loaderFile === 'string') {
            options.loaderFile = options.loaderFile.trim();
            if (!options.loaderFile) {
                options.loaderFile = safeDefault.loaderFile;
            }
        }
        else {
            options.loaderFile = safeDefault.loaderFile;
        }

        if (options.loaderStrategy && typeof options.loaderStrategy === 'string') {
            options.loaderStrategy = options.loaderStrategy.trim();
            if (!options.loaderStrategy) {
                options.loaderStrategy = safeDefault.loaderStrategy;
            }
        }
        else {
            options.loaderStrategy = safeDefault.loaderStrategy;
        }

        // Delegate to the main library for all of the hard work of actually
        // setting up a server.
        super(options);
    }
}

// Public API.
module.exports = FriendlyServer;
