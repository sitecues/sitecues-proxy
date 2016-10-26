//
// This is the heart and soul of the sitecues Proxy.
// It provides an API to create servers.
//

// TODO: When implementing HTTPS, this will be useful:
//       http://apetec.com/support/GenerateSAN-CSR.htm

'use strict';

const path = require('path');
const fs = require('fs');
const Signal = require('adverb-signals');
const hoxy = require('hoxy');
const isRoot = require('is-root');
const { isAbsolute } = require('url-type');
const log = require('./log');
const intercept = require('./intercept');
const loader = require('./loader');

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

        const createPhaseGetter = (phaseName) => {
            return () => {
                return state.phase === phase[phaseName];
            };
        };

        const createPhaseSetter = (phaseName, lowerCasePhaseName) => {
            return (val) => {
                if (!val) {
                    throw new TypeError(
                        `Setting ${lowerCasePhaseName} to a falsy ` +
                        'value is ambiguous. A phase cannot be ' +
                        'derived from it.'
                    );
                }
                state.phase = phase[phaseName];
            };
        };

        // Create a list of event controllers for this server.
        const signals = this.signals = {};

        // Endow the state object with shortcuts to test for specific phases.
        // Use the opportunity to create signals for each one as well.
        for (const phaseName in phase) {
            // Make sure the loop logic only touches keys we created.
            if (Object.prototype.hasOwnProperty.call(phase, phaseName)) {
                // TODO: We should handle multi-word names with camel case.
                const lowerCasePhaseName = phaseName.toLowerCase();
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

        // TODO: Reverse mode used to be a thing. It's not anymore. Remove this.
        state.direction = 'forward';
        state.reverseMode = false;

        const proxyOpts = {};

        proxyOpts.certAuthority = {
            key  : fs.readFileSync('./proxy-ca/key/proxy-ca.key'),
            cert : fs.readFileSync('./proxy-ca/cert/proxy-ca.cert')
        };

        const proxy = this.hoxyInstance = hoxy.createServer(proxyOpts);

        // This function is responsible for forwarding hoxy log events
        // to our own logger. At the moment, there is a 1:1 mapping
        // for our event names which makes this super easy.
        const onLog = (event) => {
            log[event.level](event.message);
        };

        proxy.on('error', (err) => {
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
                    err.message = `Insufficient privileges to run on port ${state.port}.`;
                    if (!isRoot()) {
                        err.message += ' Using sudo may help.';
                    }
                }
                else if (err.code === 'EADDRINUSE') {
                    err.message = `Port ${state.port} is already being used by somebody.`;
                }

                throw err;
            }
        });

        proxy.log('warn debug', onLog);
        // We intentionally ignore the first info log, because it duplicates a
        // message that we log ourselves of the "server is listening" variety.
        proxy.once('info', () => {
            proxy.log('info', onLog);
        });

        // Register handlers for altering data in-transit between
        // the client browser and the target server.

        // Handler for all requests. It flags sessions as tests via headers
        // and maps URLs given in the path to their final destination when
        // in reverse mode.
        proxy.intercept(
            {
                phase    : 'request',
                protocol : /^http/
            },
            intercept.request(this)
        );

        // Handler for all HTML responses. This is where we add and/or remove
        // sitecues within the page. It is also where we modify page content
        // to conform to the expectations of the reverse proxy.
        proxy.intercept(
            {
                // Construct a DOM from the page.
                as       : '$',
                mimeType : /html/,
                phase    : 'response',
                protocol : /^http/
            },
            intercept.htmlResponse(this)
        );
    }

    // Take care of user settings that can only be initialized asynchronously.
    init() {
        const { config, state } = this;

        if (state.startedInitializing) {
            return Promise.resolve(this);
        }

        state.startedInitializing = true;

        const doInit = (resolve, reject) => {
            if (config.loader && typeof config.loader === 'object') {
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
                    (err, data) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        state.loader = data;

                        resolve(this);
                    }
                );
            }
            else {
                throw new Error('Unable to determine a loader to use.');
            }
        };

        return new Promise(doInit);
    }

    start() {
        const { state } = this;
        const started = state.started ? 'started' : false;
        const inProgress = state.starting ? 'starting' : started;

        if (inProgress) {
            return Promise.reject(new Error(
                    `The sitecues proxy ${state.name} is already ${inProgress}.`
                ));
        }

        if (!state.startedInitializing) {
            return Promise.reject(new Error(
                    `The sitecues proxy ${state.name} is not initialized.`
                ));
        }

        state.phase = phase.STARTING;
        this.signals.starting.emit();

        const that = this;
        const proxy = this.hoxyInstance;

        const setup = () => {
            if (!state.scan) {
                return;
            }
            // WORK IN PROGRESS.
            return portStatus.findAPortNotInUse({
                strategy : portStatus.strategy.FIND_UP
            })
                .then((foundPort) => {
                    state.port = foundPort;
                });
        };

        const doStart = () => {
            // The state object has the user's desired settings mixed in with
            // defaults, etc.
            const listenOpts = Object.create(state);

            return new Promise((resolve, reject) => {
                const onError = (err) => {
                    if (err.code === 'EACCES') {
                        err.message = `Insufficient privileges to run on port ${state.port}.`;
                        if (!isRoot()) {
                            err.message += ' Using sudo may help.';
                        }
                    }
                    else if (err.code === 'EADDRINUSE') {
                        err.message = `Port ${state.port} is already being used by somebody.`;
                    }

                    reject(err);
                };

                // If we get an error before the proxy is listening,
                // it probably means the port was not available.
                proxy.once('error', onError);
                proxy.listen(
                    {
                        port : listenOpts.port
                    },
                    (err) => {
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
        };

        return Promise.resolve().then(setup).then(doStart);
    }

    stop() {
        const { state } = this;
        const stopped = state.stopped ? 'stopped' : false;
        const inProgress = state.stopping ? 'stopping' : stopped;

        if (inProgress) {
            return Promise.reject(new Error(
                    `The sitecues proxy ${this.name} is already ${inProgress}.`
                ));
        }

        state.phase = phase.STOPPING;
        this.signals.stopping.emit();

        const that = this;
        const proxy = this.hoxyInstance;

        const doStop = (resolve, reject) => {
            proxy.once('error', reject);
            proxy.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(that);
            });
        };

        // This function is designed to run when the server has completed all
        // connections and will not accept new ones. The user is responsible
        // for logging about this, since they are in a better position to
        // know what is happening and why.
        const onStopped = () => {
            // Let the world know we have left the building.
            state.phase = phase.STOPPED;
            that.signals.stopped.emit();

            return that;
        };

        return (new Promise(doStop)).then(onStopped);
    }
}

// Static data properties.
Server.phase = phase;

module.exports = Server;
