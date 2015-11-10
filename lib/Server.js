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
      util        = require('./util').general,  // internal project utilities
      defaults    = require('./defaults'),      // port constants
      log         = require('./log'),
      intercept   = require('./intercept'),
      dangit      = require('dangit'),
      joinTruthy  = dangit.joinTruthy;

const phase = {
    STOPPING : -1,
    STOPPED  : 0,
    STARTING : 1,
    STARTED  : 2
};

function capitalize(input) {
    return input[0].toUpperCase() + input.slice(1);
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
                configurable : true,
                enumerable   : true,
                get : function () {
                    return state.scheme + ':';
                },
                set : function () {
                    throw new Error(
                            'Protocol setting is not implemented. Use scheme.'
                        );
                }
            },
            host : {
                configurable : true,
                enumerable   : true,
                get : function () {
                    return state.hostname + ':' + state.port;
                },
                set : function () {
                    throw new Error(
                            'Host setting is not implemented. Use hostname/port.'
                        );
                }
            },
            origin : {
                configurable : true,
                enumerable   : true,
                get : function () {
                    return state.protocol + '//' + state.host;
                },
                set : function () {
                    throw new Error(
                            'Origin setting is not implemented.'
                        );
                }
            },
            base : {
                configurable : true,
                enumerable   : true,
                get : function () {
                    return state.origin + '/';
                },
                set : function () {
                    throw new Error(
                            'Base setting is not implemented.'
                        );
                }
            },
            path : {
                configurable : true,
                enumerable   : true,
                get : function () {
                    let result = '';
                    if (state.reverseMode) {
                        result = joinTruthy(
                            { separator : '/' },
                            state.contextPath,
                            state.route.page
                        ) || result;
                    }
                    return result;
                },
                set : function () {
                    throw new Error(
                            'Path setting is not implemented.'
                        );
                }
            },
            url : {
                configurable : true,
                enumerable   : true,
                get : function () {
                    return joinTruthy(
                            { separator : '/' },
                            state.origin,
                            state.path
                        );
                },
                set : function () {
                    throw new Error(
                            'URL setting is not implemented.'
                        );
                }
            }
        });

        // Create a list of event controllers for this server.
        const signals = this.signals = {};

        // Endow the state object with shortcuts to test for specific phases.
        // Use the opportunity to create signals for each one as well.
        for (let phaseName in phase) {
            let lowerCasePhaseName = phaseName.toLowerCase();
            signals[lowerCasePhaseName] = new Signal();
            Object.defineProperty(state, lowerCasePhaseName, {
                configurable : true,
                enumerable   : true,
                get : function () {
                    return state.phase === phase[phaseName];
                },
                set : function (val) {
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
                }
            });
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

        if (state.reverseMode) {
            if (!state.target) {
                throw new Error(
                        'A target was not supplied, but is required to reverse proxy.'
                    );
            }
            this._proxy = hoxy.createServer(
                {
                    // Tell the proxy where requests should be routed by default.
                    // We override this for each request, so you should never
                    // actually see it, but it is necessary configuration to
                    // enter reverse mode in the underlying API.
                    reverse : state.target
                }
            );
        }
        else {
            this._proxy = hoxy.createServer();
        }

        const proxy = this._proxy;

        function onLog(event) {

            // Log events have three properties:
            //  - level: the importance hoxy has assigned to this event
            //  - message: description of the event
            //  - error: the original error object, if any

            // Note that event.message is similar to event.error.message,
            // in the case of an error. However, it does not pass through
            // error types transparently. We correct for that below.

            // TODO: Move to the util module.
            function isUsefulLog(event) {
                // TODO: return false for 404 errors at event.error
                return true;
            }

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
                url      : '/' + joinTruthy(
                    { separator : '/' },
                    state.contextPath,
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
                    state.origin,       // 'scheme://hostname:port' for the server
                    state.contextPath,
                    state.route.page,
                    target
                );
        }
        else {
            result = target;
        }

        return result;
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

        // TODO: If options.port === 'auto', then replace state.port with:
        //        1. Default port, IF portStatus says it is available
        //        2. If not, scan up from the default until we find an available port
        // This is an old implementation that doesn't behave quite how I want.
        // if (typeof port === 'string' &&
        //     port.trim().toLowerCase().indexOf('auto') === 0) {
        //     port = defaultPorts[options.direction];
        //     // Asynchronously find an available port in the given range
        //     // and start the proxy when that is finished.
        //     portscanner.findAPortNotInUse(port, MAX_PORT, '127.0.0.1', startProxy);
        // }
        // else {
        //     port = util.sanitizePort(port, MIN_PORT, MAX_PORT, DEFAULT_PORT);
        //     // Launch the proxy using a specific port.
        //     process.nextTick(
        //         startProxy.bind(proxy, undefined, port)
        //     );
        // }

        // if (foundPort !== port) {
        //     log.warn(
        //         'Port ' + port + ' is not available. Using ' + foundPort +
        //         ' instead, which is the next one free.'
        //     );
        // }
        // port = foundPort;

        // TODO: Grab only what we want from the options object, initialize it,
        //       and only then save it to state. The user should probably not
        //       be allowed to set state.phase, for example.
        Object.assign(state, options);

        // TODO: Determine if we should scan up from options.port for an
        //       available port. Then do portType.haveRights() and if we
        //       have the rights, then save options.port to state.port


        function doListen(resolve, reject) {
            // The state object has the user's desired settings mixed in with
            // defaults, etc.
            const listenOpts = Object.create(state);
            // In most situations, the state object's hostname is ideal, as it
            // represents how we want to access the server. But when binding
            // the server to an IP address, we want the special INADDR_ANY
            // value so that both localhost and the local network IP work,
            // for example.
            listenOpts.hostname = '0.0.0.0';

            // If we get an error before the proxy is listening,
            // it probably means the port was not available.
            proxy.once('error', reject);
            proxy.listen(listenOpts, resolve);
        }

        function onListening() {

            // This function is designed to run when the server is up and ready
            // to accept connections. It is responsible primarily for filling
            // in runtime state that can only be determined after that point,
            // such as which port the OS decided to assign to us if the user
            // asked for a random one.

            // Ask the proxy about the metadata assigned to it by the OS.
            const address = proxy.address();

            // Save useful data to our instance.
            state.port = address.port;
            // NOTE: Do not save address.address, as it referse to where the
            //       socket is bound, rather than how we want to access it.

            // Let the world know we have arrived.
            state.phase = phase.STARTED;
            that.signals.started.emit();

            return that;
        }

        return (new Promise(doListen)).then(onListening);
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
            proxy.close(resolve);
        }

        function onClosed() {

            // This function is designed to run when the server has completed all
            // connections and will not accept new ones. It is responsible for
            // letting the user know this via logging.

            // Let the world know we have left the building.
            state.phase = phase.STOPPED;
            that.signals.stopped.emit();

            return that;
        }

        return (new Promise(doClose)).then(onClosed);
    }
}

// Method aliases.
Server.prototype.start  = Server.prototype.listen;
Server.prototype.stop   = Server.prototype.close;
// Static data properties.
Server.phase = phase;

module.exports = Server;
