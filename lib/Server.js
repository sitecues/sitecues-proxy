//
// This is the heart and soul of the sitecues Proxy.
// It provides an API to create servers.
//

// TODO: When implementing HTTPS, this will be useful:
//       http://apetec.com/support/GenerateSAN-CSR.htm

'use strict';

const Promise     = require('bluebird'),
      Signal      = require('adverb-signals'),
      portscanner = require('portscanner'),     // find available ports
      url         = require('url'),             // URL manipulation utilities
      hoxy        = require('hoxy'),            // API for making proxies
      path        = require('path'),
      fs          = require('fs'),
      //osProxy     = require('os-proxy'),
      isRoot      = require('is-root'),
      dangit      = require('dangit'),
      log         = require('./log'),
      intercept   = require('./intercept'),
      loader      = require('./loader'),
      joinTruthy  = dangit.joinTruthy,
      isAbsoluteUrl = require('url-type').isAbsolute;

const phase = {
    STOPPING : -1,
    STOPPED  : 0,
    STARTING : 1,
    STARTED  : 2
};

// Work in Progress

class Server {
    constructor(options) {
        // Server instance config inherits from user-provided options, so that we
        // never alter what does not belong to us.
        this.config = options ? Object.create(options) : {};

        // State inherits from config, for convenience.
        const state = this.state = Object.create(this.config);

        Object.defineProperties(state, {
            // Maintain some consistency with browsers.
            protocol : {
                enumerable   : true,
                get : function () {
                    return state.scheme + ':';
                },
                set : function () {
                    throw new Error(
                            'Setting the protocol is not implemented. Use scheme.'
                        );
                }
            },
            host : {
                enumerable   : true,
                get : function () {
                    return state.hostname + ':' + state.port;
                },
                set : function () {
                    throw new Error(
                            'Setting the host is not implemented. Use hostname/port.'
                        );
                }
            },
            origin : {
                enumerable   : true,
                get : function () {
                    return url.format(
                            {
                                protocol : state.protocol,
                                host     : state.host
                            }
                        );
                },
                set : function () {
                    throw new Error(
                            'Setting the origin is not implemented.'
                        );
                }
            },
            base : {
                enumerable   : true,
                get : function () {
                    const origin = state.origin;
                    return origin.lastIndexOf('/') === origin.length - 1 ? origin : origin + '/';
                },
                set : function () {
                    throw new Error(
                            'Setting the base URL is not implemented.'
                        );
                }
            },
            pagePath : {
                enumerable   : true,
                get : function () {
                    let result = '';
                    if (state.reverseMode) {
                        result = path.posix.join(
                            state.contextPath || '',
                            state.route.page || ''
                        ) || result;
                    }
                    return result;
                },
                set : function () {
                    throw new Error(
                            'Setting the page API path is not implemented.'
                        );
                }
            },
            pageUrl : {
                enumerable   : true,
                get : function () {
                    return url.resolve(
                            state.origin,
                            state.pagePath
                        );
                },
                set : function () {
                    throw new Error(
                            'Setting the page API URL is not implemented.'
                        );
                }
            }
        });

        function createPhaseGetter(phaseName) {
            return function () {
                return state.phase === phase[phaseName];
            };
        }

        function createPhaseSetter(phaseName, lowerCasePhaseName) {
            return function (val) {
                if (val) {
                    state.phase = phase[phaseName];
                }
                else {
                    throw new TypeError(
                            'Setting ' + lowerCasePhaseName      +
                            ' to a falsy value is ambiguous. '   +
                            'A phase cannot be derived from it.'
                        );
                }
            };
        }

        // Create a list of event controllers for this server.
        const signals = this.signals = {};

        // Endow the state object with shortcuts to test for specific phases.
        // Use the opportunity to create signals for each one as well.
        for (let phaseName in phase) {
            // Make sure the loop logic only touches keys we created.
            if (Object.prototype.hasOwnProperty.call(phase, phaseName)) {
                // TODO: We should handle multi-word names with camel case.
                let lowerCasePhaseName = phaseName.toLowerCase();
                signals[lowerCasePhaseName] = new Signal();
                Object.defineProperty(state, lowerCasePhaseName, {
                    enumerable   : true,
                    get : createPhaseGetter(phaseName),
                    set : createPhaseSetter(phaseName, lowerCasePhaseName)
                });
            }
        }

        // The server starts out "at rest", when created.
        state.phase = phase.STOPPED;

        // Set abstraction for convenience.
        if (state.direction === 'reverse') {
            state.reverseMode = true;
        }
        else {
            state.direction = 'forward';
            state.reverseMode = false;
        }

        const proxyOpts = {};

        if (state.reverseMode) {
            if (!state.target) {
                throw new Error(
                        'A target was not supplied, but is required to reverse proxy.'
                    );
            }

            // Tell the proxy where requests should be routed by default.
            // We override this for each request, so you should never
            // actually see it, but it is necessary configuration to
            // enter reverse mode in the underlying API.
            proxyOpts.reverse = state.target;
        }

        const proxy = this._proxy = hoxy.createServer(proxyOpts);

        function onLog(event) {

            // This function is responsible for forwarding hoxy log events
            // to our own logger. At the moment, there is a 1:1 mapping
            // for our event names which makes this super easy.

            log[event.level](event.message);
        }

        proxy.on('error', function (err) {
            // A request came in, but we were unable to map it to a known IP address
            // to send it to.
            if (err.code === 'ENOTFOUND') {
                log.warn('DNS was unable to find an IP for the target of a request.');
            }
            // A request came in, and we were able to lookup where to send it,
            // but no one was around to answer.
            else if (err.code === 'ECONNREFUSED') {
                log.warn('Unable to connect to the target of a request.');
            }
            // We waited around for a response that did not come in a
            // reasonable amount of time.
            else if (err.code === 'ETIMEDOUT') {
                log.warn('The target is not responding. Giving up.');
            }
            else {
                if (err.code === 'EACCES') {
                    err.message = 'Insufficient privileges to run on port ' + state.port + '.';
                    if (!isRoot()) {
                        err.message += ' Using sudo may help.'
                    }
                }
                else if (err.code === 'EADDRINUSE') {
                    err.message = 'Port ' + state.port + ' is already being used by somebody.';
                }
                throw err;
            }
        });

        proxy.log('warn debug', onLog);
        // We intentionally ignore the first info log, because it duplicates a
        // message that we log ourselves of the "server is listening" variety.
        proxy.once('info', function () {
            proxy.log('info', onLog);
        });

        // Register handlers for altering data in-transit between
        // the client browser and the target server.

        // Handler for health status checks.
        proxy.intercept(
            {
                phase    : 'request',  // run before we send data to the target
                protocol : /^http/,    // only run if using HTTP(S)
                url      : path.posix.join(
                    '/',
                    state.contextPath || '',
                    state.route.status
                )
            },
            intercept.status.bind(this)  // code to run if all conditions above are met
        );

        // Handler for all requests. It flags sessions as tests via headers
        // and maps URLs given in the path to their final destination when
        // in reverse mode.
        proxy.intercept(
            {
                phase    : 'request',  // run before we send data to the target
                protocol : /^http/     // only run if using HTTP(S)
            },
            intercept.request.bind(this)  // code to run if all conditions above are met
        );

        // Handler for all responses in reverse mode. This takes care of redirects.
        // In reverse mode, redirects need to be modified to use proxy URLs.
        if (state.reverseMode) {
            proxy.intercept(
                {
                    phase : 'response'
                },
                intercept.response.bind(this)
            );
        }

        // Handler for all HTML responses. This is where we add and/or remove
        // sitecues on the page.
        proxy.intercept(
            {
                phase    : 'response',  // run before we send data to the client
                as       : '$',         // construct a DOM from the page
                mimeType : /html/,      // only run if response is (X)HTML
                protocol : /^http/      // only run if using HTTP(S)
            },
            intercept.htmlResponse.bind(this)  // code to run if all conditions above are met
        );
    }

    // Take care of user settings that can only be initialized asynchronously.
    init() {

        const
            config = this.config,
            state  = this.state;

        if (state._initialized) {
            return Promise.resolve(this);
        }
        state._initialized = true;

        function doInit(resolve, reject) {
            if (dangit.isExtendableType(config.loader)) {
                // Turn the loader object into a loader string.
                state.loader = loader.createLoader(config.loader);
                resolve(this);
            }
            else if (config.loader && typeof config.loader === 'string') {
                state.loader = config.loader;
                resolve(this);
            }
            else if (config.loaderFile && typeof config.loaderFile === 'string') {
                fs.readFile(
                    path.resolve(__dirname, '..', config.loaderFile),
                    {
                        encoding : 'utf8'
                    },
                    function (err, data) {
                        if (err) {
                            throw err;
                        }

                        state.loader = data;

                        resolve(this);
                    }
                );
            }
            else {
                throw new Error('Unable to determine a loader to use.');
            }
        }

        return new Promise(doInit);
    }

    toProxiedUrl(target) {

        // This function is designed to give back a URL that uses
        // the proxy to visit the target.

        const state = this.state;

        let result;

        // If no target is provided, delegate to the server instance.
        if (!target) {
            target = state.target || '';
        }

        if (state.reverseMode) {
            result = joinTruthy(
                    { separator : '/' },
                    state.pageUrl,
                    target
                );
        }
        else {
            result = target;
        }

        return result;
    }

    // Given a URL that makes use of the proxy (such as any incoming request),
    // extract the target website and return it such that visiting the result
    // URL will not use the proxy.
    toBypassedUrl(options) {

        const
            state = this.state;

        // In forward mode, it is not possible to bypass the proxy here because all
        // traffic is routed through us at the OS level.
        if (!state.reverseMode) {
            throw new Error(
                'There is no URL format that will bypass a forward proxy. ' +
                'You must configure a bypass at the OS level.'
            );
        }

        // In reverse mode, requests always point to the domain of the proxy itself,
        // and the target is in the path, so we must extract it from there.

        // Define parts of the path we don't care about, in order to ignore
        // them when computing the target.
        const targetCruft = new RegExp(
            '^' +
            path.posix.join(
                '/',
                state.contextPath ? state.contextPath + '/' : '',
                state.route.page ?
                    '(?:' + path.posix.join('.', state.route.page, '/') + ')?' :
                    ''
            )
        );

        let inputUrl = options.url;

        // Deal with the case where the input URL is known to contain the
        // proxy's origin. For example, when we need to extract the
        // original target from a Referer header.
        if (options.stripOrigin && isAbsoluteUrl(inputUrl)) {
            const urlData = url.parse(inputUrl);
            inputUrl = inputUrl.substring(
                inputUrl.indexOf(urlData.host) + urlData.host.length
            );
        }

        // Extract the desired target from the URL by removing everything else.
        // This is more reliable than attempting to pattern match all valid
        // target URLs.
        const target = inputUrl.replace(targetCruft, '');

        return target;
    }

    listen(options) {

        const
            state = this.state,
            inProgress = state.starting ? 'starting' :
                         state.started  ? 'started'  :
                         false;

        if (inProgress) {
            return Promise.reject(new Error(
                    'The sitecues proxy ' + state.name +
                    ' is already ' + inProgress + '.'
                ));
        }

        if (!state._initialized) {
            return Promise.reject(new Error(
                    'The sitecues proxy ' + state.name +
                    ' is not initialized.'
                ));
        }

        state.phase = phase.STARTING;
        this.signals.starting.emit();

        const
            that = this,
            proxy = this._proxy;

        function setup() {
            if (state.scan) {
                // WORK IN PROGRESS.
                return portStatus.findAPortNotInUse(
                        {
                            strategy : portStatus.strategy.FIND_UP
                        }
                    )
                    .then(function (foundPort) {
                        state.port = foundPort;
                        return;
                    });
            }
        }

        function doListen() {
            // The state object has the user's desired settings mixed in with
            // defaults, etc.
            const listenOpts = Object.create(state);
            // In most situations, the state object's hostname is ideal, as it
            // represents how we want to access the server. But when binding
            // the server to an IP address, we want the special INADDR_ANY
            // value so that both localhost and the local network IP work,
            // for example.
            listenOpts.hostname = '0.0.0.0';

            return new Promise(function (resolve, reject) {

                    function onError(err) {
                        if (err.code === 'EACCES') {
                            err.message = 'Insufficient privileges to run on port ' + state.port + '.';
                            if (!isRoot()) {
                                err.message += ' Using sudo may help.'
                            }
                        }
                        else if (err.code === 'EADDRINUSE') {
                            err.message = 'Port ' + state.port + ' is already being used by somebody.';
                        }

                        reject(err);
                    }

                    // If we get an error before the proxy is listening,
                    // it probably means the port was not available.
                    proxy.once('error', onError);
                    proxy.listen(
                        {
                            host : listenOpts.hostname,
                            port : listenOpts.port
                        },
                        function (err) {
                            if (err) {
                                onError(err);
                                return;
                            }

                            // This code is designed to run when the server is up and ready to
                            // accept connections. It is responsible primarily for filling
                            // in runtime state that can only be determined after that point,
                            // such as which port the OS decided to assign to us if the user
                            // asked for a random one (can be done with the magic 0).

                            // Ask the proxy about the metadata assigned to it by the OS.
                            const address = proxy.address();

                            // Save useful data to our instance.
                            state.port = address.port;
                            // NOTE: Do not save address.address, as it refers to where the
                            //       socket is bound, rather than how we want to access it.

                            // Let the world know we have arrived.
                            state.phase = phase.STARTED;
                            that.signals.started.emit();

                            resolve(that);
                        }
                    );
                });
        }

        return Promise.resolve().then(setup).then(doListen);
    }

    close() {

        const
            state = this.state,
            inProgress = state.stopping ? 'stopping' :
                         state.stopped  ? 'stopped'  :
                         false;

        if (inProgress) {
            return Promise.reject(new Error(
                    'The sitecues proxy ' + this.name +
                    ' is already ' + inProgress + '.'
                ));
        }

        state.phase = phase.STOPPING;
        this.signals.stopping.emit();

        const
            that = this,
            proxy = this._proxy;

        function doClose(resolve, reject) {
            proxy.once('error', reject);
            proxy.close(
                function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(that);
                }
            );
        }

        function onClosed() {

            // This function is designed to run when the server has completed all
            // connections and will not accept new ones. The user is responsible
            // for logging about this, since they are in a better position to
            // know what is happening and why.

            // Let the world know we have left the building.
            state.phase = phase.STOPPED;
            that.signals.stopped.emit();

            return that;
        }

        return (new Promise(doClose)).then(onClosed);
    }
}

// Method aliases.
Server.prototype.start = Server.prototype.listen;
Server.prototype.stop  = Server.prototype.close;
// Static data properties.
Server.phase = phase;

module.exports = Server;
