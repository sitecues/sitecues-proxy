//
// This is the heart and soul of the sitecues Proxy.
// It provides an API to create servers.
//

// TODO: When implementing HTTPS, this will be useful: http://apetec.com/support/GenerateSAN-CSR.htm

'use strict';

const Promise     = require('bluebird'),
      Signal      = require('adverb-signals'),
      portscanner = require('portscanner'),     // find available ports
      url         = require('url'),             // URL manipulation utilities
      hoxy        = require('hoxy'),            // API for making proxies
      path        = require('path'),
      fs          = require('fs'),
      //osProxy     = require('os-proxy'),
      dangit      = require('dangit'),
      util        = require('./util').general,  // internal project utilities
      log         = require('./log'),
      intercept   = require('./intercept'),
      initConfig  = require('./init-config'),
      loader      = require('./loader'),
      joinTruthy  = dangit.joinTruthy;

const phase = {
    STOPPING : -1,
    STOPPED  : 0,
    STARTING : 1,
    STARTED  : 2
};

// TODO: Move these to the util module.
function capitalize(input) {
    return input[0].toUpperCase() + input.slice(1);
}
function isUsefulLog(event) {
    // TODO: return false for 404 errors at event.error
    return true;
}

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

        // The server starts out in a stopped state, when created.
        state.phase = phase.STOPPED;

        // Set abstraction for convenience.
        if (state.direction === 'reverse') {
            state.reverseMode = true;
        }
        // Sanitize.
        else {
            state.direction = 'forward';
            state.reverseMode = false;
        }

        if (dangit.isExtendableType(state.loader)) {
            // Turn the loader object into a loader string.
            state.loader = loader.createLoader(state.loader);
        }
        else if (
                (!state.loader || typeof state.loader !== 'string') &&
                typeof state.loaderFile === 'string' && state.loaderFile
            ) {
            state.loader = fs.readFileSync(
                path.resolve(__dirname, '..', options.loaderFile),
                'utf8'
            );
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

            // Log events have three properties:
            //  - level: the importance hoxy has assigned to this event
            //  - message: description of the event
            //  - error: the original error object, if any

            // Note that event.message is similar to event.error.message,
            // in the case of an error. However, it does not pass through
            // error types transparently. We correct for that below.

            // Ignore pointless things to log, such as 404 errors.
            if (!isUsefulLog(event)) {
                return;
            }

            let message = event.message;

            if (event.error) {

                // Hoxy isn't specific enough about error types (does not pass
                // them through transparently), so we search for where it would be
                // and throw out the vague garbage. We will re-construct ourselves.
                const errTypeIndex = message.search(/\w*?(?=:)/);

                // Hoxy throws in some useful data (like the phase), before the error
                // type, so let's keep that.
                message = message.substring(0, errTypeIndex);

                if (message) {
                    message = capitalize(message);
                }

                // Add the full stack trace to aid debugging. It comes with a
                // specific error type. Hooray!
                message += event.error.stack;
            }

            log[event.level](message);
        }

        proxy.log('info error warn debug', onLog);


        // Register handlers for altering data in-transit between
        // client and server.

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
    toBypassedUrl(inputUrl) {

        const state = this.state;

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

        // Extract the desired target from the URL by removing everything else.
        // This is more reliable than attempting to pattern match all valid
        // target URLs.
        const target = inputUrl
                  .replace(targetCruft, '')
                  // Default the target to HTTP, in case the user is lazy.
                  .replace(/^(?!(?:\w+:)?\/\/)/, 'http://');

        return target;
    }

    listen(options) {

        const that  = this,
              proxy = that._proxy,
              state = that.state,
              inProgress = state.starting ? 'starting' :
                           state.started  ? 'started'  :
                           false;

        if (inProgress) {
            // TODO: We could just do: return Promise.resolve(that)
            //       Which is more desirable?
            return Promise.reject(
                    new Error(
                        'The sitecues proxy ' + state.name + ' is already ' + inProgress + '.'
                    )
                );
        }

        state.phase = phase.STARTING;
        that.signals.starting.emit();

        initConfig(state, options);

        function setup() {

            let result;

            if (state.scan) {
                result = portStatus.findAPortNotInUse(
                        {
                            strategy : portStatus.strategy.FIND_UP
                        }
                    )
                    .then(function (foundPort) {
                        state.port = foundPort;
                        return;
                    });
            }
            else {
                result = Promise.resolve();
            }

            return result;
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
                            err.message = 'Insufficient privileges to run on port ' + state.port;
                            if (!isRoot()) {
                                err.message += ', using sudo may help.'
                            }
                            err.message += '.';
                        }
                        else if (err.code === 'EADDRINUSE') {
                            err.message = 'Port ' + state.port + 'is already being used by somebody.';
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

        return setup().then(doListen);
    }

    close() {

        const that  = this,
              proxy = that._proxy,
              state = that.state,
              inProgress = state.stopping ? 'stopping' :
                           state.stopped  ? 'stopped'  :
                           false;

        if (inProgress) {
            // TODO: We could just do: return Promise.resolve(that)
            //       Which is more desirable?
            throw new Error(
                    'The sitecues proxy ' + that.name + ' is already ' + inProgress + '.'
                );
        }

        state.phase = phase.STOPPING;
        that.signals.stopping.emit();

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
