//
// This is the heart and soul of our application.
// It exposes an API to start and stop a proxy.
//

// We deploy this to proxy.dev.sitecues.com, but it works locally as well.

// TODO: When implementing HTTPS, this will be useful: http://apetec.com/support/GenerateSAN-CSR.htm

// TODO: is-absolute-url updated to 2.0.0, which changes protocol-relative
//       URLs to be treated as absolute (return true) -- update our code

'use strict';

var portscanner = require('portscanner'),      // find available ports
    url         = require('url'),              // URL manipulation utilities
    hoxy        = require('hoxy'),             // API for making proxies
    util        = require('./util').general,   // internal project utilities
    defaults    = require('./defaults'),       // port constants
    log         = require('./util').log,
    intercept   = require('./intercept'),
    dangit      = require('dangit'),
    joinTruthy  = dangit.joinTruthy;


// Work in Progress

function listen(options) {

    var that  = this,
        proxy = that._proxy,
        state = that.state,
        inProgress,
        result;

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
    state.starting = true;
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


    function onListening() {

        // This function is designed to run when the server is up and ready
        // to accept connections. It is responsible primarily for filling
        // in runtime state that can only be determined after that point,
        // such as which port the OS decided to assign to us if the user
        // asked for a random one.

        var message = 'The sitecues\u00AE',
            // Ask the proxy about the metadata assigned to it by the OS.
            address = proxy.address();

        // Let the world know we have arrived.
        state.starting = false;
        state.started  = true;

        // Save useful data to our instance.
        state.port     = address.port;
        // Yes, address.address is intentional!
        state.hostname = address.address;

        if (state.reverseMode) {
            message += ' reverse';
        }
        message += ' proxy is on port ' + state.port + '.';

        log.info(message);

        return that;
    }

    function doListen(resolve, reject) {
        // If we get an error before the proxy is listening,
        // it probably means the port was not available.
        proxy.once('error', reject);
        proxy.listen(options, resolve);
    }

    result = (new Promise(doListen)).then(onListening);

    return result;
}

function close() {

    var that  = this,
        proxy = that._proxy,
        state = that.state,
        inProgress;

    inProgress = state.stopping ? 'stopping' :
                 state.stopped  ? 'stopped'  :
                 false;

    if (inProgress) {
        throw new Error(
            'The sitecues proxy ' + that.name + ' is already ' + inProgress + '.'
        );
    }
    state.stopping = true;

    function onClosed() {

        // This function is designed to run when the server has completed all
        // connections and will not accept new ones. It is responsible for
        // letting the user know this via logging.

        var message = 'The sitecues\u00AE';

        // Let the world know we have left the building.
        state.stopping = false;
        state.stopped  = true;

        if (state.reverseMode) {
            message += ' reverse';
        }
        message += ' proxy is on port ' + state.port + '.';

        log.info(message);

        return that;
    }

    function doClose(resolve, reject) {
        // If we get an error before the proxy is listening,
        // it probably means the port was not available.
        proxy.once('error', reject);
        proxy.close(resolve);
    }

    result = (new Promise(doClose)).then(onClosed);

    return result;
}

function toProxiedUrl(target) {

    // This function is designed to give back a URL that uses
    // the proxy to visit the target.

    var state = this.state, result;

    // If no target is provided, delegate to the server instance.
    if (!target) {
        target = state.target || '';
    }

    if (state.reverseMode) {
        result = joinTruthy(
                { seperator : '/' },
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

function Server(options) {

    var state, proxy;

    // Server instance config inherits from user-provided options, so that we
    // never alter what does not belong to us.
    this.config = options ? Object.create(options) : {};
    // State inherits from config, for convenience.
    state = this.state = Object.create(this.config);

    if (state.direction && typeof state.direction === 'string') {
        state.direction = state.direction.trim().toLowerCase();
        if (!state.direction) {
            state.direction = defaults.direction;
        }
    }
    else {
        state.direction = defaults.direction;
    }
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

    // Special behavior for non-object-like input.
    if (!dangit.isExtendableType(state.route)) {
        // TODO: Implement defaults.route
        state.route = defaults.route;
    }

    proxy = this._proxy;

    function capitalize(input) {
        return input[0].toUpperCase() + input.slice(1);
    }

    function onUnusualLog(event) {

        // Unusual logs are error, warn, or debug logs.

        var message, errTypeIndex;

        console.log('nooooo :(');
        console.log('arguments.length')
        console.log(arguments.length);
        console.log('event.toString():');
        console.log(event.toString());
        console.log('event.name');
        console.log(event.name);
        console.log('event.level');
        console.log(event.level);
        console.log('event.message');
        console.log(event.message);
        console.log('event.syscall');
        console.log(event.syscall);
        console.log('event.code');
        console.log(event.code);
        console.log('event.errno');
        console.log(event.errno);
        console.log('event.constructor');
        console.log(event.constructor);
        console.log('event.stack');
        console.log(event.stack);
        console.log('event.error');
        console.log(event.error);

        // OLD WAY
        // log.error(
        //     event.level[0].toUpperCase() + event.level.slice(1) + ': ' +
        //     event.message[0].toUpperCase() + event.message.slice(1)
        // );
        // if (event.error && !util.isTrivialError(error)) {
        //     log.error(event.error.stack);
        // }


        // TODO: Deal with the case where the event is not an error

        // Hoxy isn't specific enough about error types (does not pass
        // them through transparently), so we search for where it would be
        // and throw out the vague garbage. We will re-construct ourselves.
        errTypeIndex = event.message.search(/\w*?(?=:)/);
        // Hoxy throws in some useful data (like the phase), before the error
        // type, so let's keep that.
        message = event.message.substring(0, errTypeIndex);
        if (message) {
            message = capitalize(message);
        }
        // Add the full stack trace to aid debugging and it comes with a
        // specific error type! Hooray.
        message = message + event.error.stack;
        log.error(message);
    }

    function onInfoLog(event) {
        // ignore the first info log, which shows the listening port
        // and therefor duplicates something we do ourselves
        if (infoTimes > 0) {
            log.info(
                event.level + ': ' + event.message
            );
        }
        infoTimes += 1;
    }

    proxy.log('error warn debug', onUnusualLog);
    proxy.log('info', onInfo);

    // Register handlers for altering data in-transit between
    // client and server.

    proxy.intercept(
        {
            phase    : 'request',
            protocol : /^https?/,
            url      : state.contextPath + 'status'
        },
        intercept.status.bind(this)  // callback to run if all conditions above are met
    );

    proxy.intercept(
        {
            phase    : 'request',  // run before we send data to the target
            protocol : /^https?/   // only run if using HTTP(S)
        },
        intercept.request.bind(this)  // callback to run if all conditions above are met
    );
    proxy.intercept(
        {
            phase    : 'response'
        },
        intercept.response.bind(this)
    );
    proxy.intercept(
        {
            phase    : 'response',   // run before we send data to the client
            as       : '$',          // construct a DOM from the page
            mimeType : /x?html/,     // only run if response is HTML
            protocol : /^https?/     // only run if using HTTP(S)
        },
        intercept.htmlResponse.bind(this)  // callback to run if all conditions above are met
    );
}
Server.prototype.listen = listen;
Server.prototype.start  = listen;  // alias
Server.prototype.close  = close;
Server.prototype.stop   = close;   // alias
Server.prototype.toProxiedUrl = toProxiedUrl;

function sitecuesProxy(options) {
    return new Server(options);
}
// Conventionally, Node server APIs have a method like this, so we
// provide this alias to be more friendly and familiar.
sitecuesProxy.createServer = sitecuesProxy;
sitecuesProxy.Server       = Server;

module.exports = sitecuesProxy;
