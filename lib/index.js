//
// This is the heart and soul of our application.
// It exposes an API to start and stop a proxy.
//

// We deploy this to proxy.dev.sitecues.com, but it works locally as well.

// TODO: When implementing HTTPS, this will be useful: http://apetec.com/support/GenerateSAN-CSR.htm

// TODO: is-absolute-url updated to 2.0.0, which changes protocol-relative
//       URLs to be treated as absolute (return true) -- update our code

'use strict';

var pkg          = require('../package.json'),  // project metadata
    portscanner  = require('portscanner'),      // find available ports
    hoxy         = require('hoxy'),             // API for making proxies
    util         = require('./util').general,   // internal project utilities
    defaults     = require('./defaults'),       // port constants
    alignJson    = require('json-align'),       // JSON prettifier
    url          = require('url'),              // URL formatting utility
    log          = require('./util').log,
    dangit       = require('dangit'),
    joinTruthy   = dangit.joinTruthy,
    APP_NAME     = pkg.name,
    VERSION      = pkg.version,
    HEADER_NAME  = 'sitecues-Test',  // tell sitecues servers to ignore metrics
    HEADER_VALUE = 'true; proxy',
    PAGE_PATH    = 'page/',  // special route for reverse proxying pages
    CONTEXT_PATH,            // the root of all proxy routes / functionality
    redirectCodes,           // HTTP codes to
    proxyLinks,              // whether to convert page links to proxy links

redirectCodes = ['301', '302', '303', '307', '308'];

function onStatusRequest(request, response) {

    // This function runs when /status is visited.
    // You can use it for heartbeet checks.

    var status = {
            app        : APP_NAME,
            version    : VERSION,
            status     : 'OK',
            statusCode : 200,
            time       : (new Date()).toISOString(),
            process    : {
                title   : process.title,
                version : process.version,
                pid     : process.pid,
                uptime  : process.uptime()
            }
        };

    status = alignJson(status);
    response.string = status;
    response.headers['Content-Type'] = 'application/json';
}

function onRequest(request, response, cycle) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    var target = request.url,  // path of the request (following the proxy host)
        targetCruft;

    log.verbose('REQUEST ------');

    // In reverse mode, requests always point to the domain of the proxy itself,
    // and the target is in the path, so we must route traffic based on that.
    if (reverseMode) {
        // Define parts of the path we don't care about, in order to
        // ignore them when computing the target.
        targetCruft = new RegExp(
            '^' + CONTEXT_PATH + '(?:' + PAGE_PATH + ')?'
        );
        // Extract the desired target from the request path by removing
        // everything else. This is more reliable than attempting to
        // pattern match all valid target URLs.
        target = target.replace(targetCruft, '');
        // Default the target to HTTP, in case the user is lazy.
        target = target.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');

        log.verbose('Proxy path :', request.url);
        log.verbose('Target     :', target);
        log.verbose('Referer    :', request.headers.referer);
        log.verbose('Referrer   :', request.headers.referrer);

        // TODO: Deal with extraneous /favicon.ico requests, which error.

        // Redirect traffic to the URL given in the path.
        request.fullUrl(target);
    }
    // If connecting to a sitecues domain...
    if (request.hostname.indexOf('sitecues') >= 0) {
        // Send a header indicating that this is a test session...
        request.headers[HEADER_NAME] = HEADER_VALUE;
    }

    log.verbose('------ REQUEST');
}

function onResponse(request, response, cycle) {

    // This function is designed to run for ALL responses, regardless of
    // protocol, Content-Type, or other filters.

    var target = request.fullUrl();

    // In forward mode, the client's browser has all the information
    // it needs to redirect to the right place on its own. But in
    // reverse mode, neither the client nor the server that sent
    // the redirect has knowledge of the reverse proxy or the
    // routes needed to inject sitecues into the new target.
    if (reverseMode) {
        // Detect HTTP redirect responses, which would send
        // the user away from the proxy.
        if (redirectCodes.indexOf(response.statusCode.toString()) >= 0) {
            // Re-write HTTP redirects to use the proxy.
            // These can be relative, so we must resolve
            // them from the original target.
            response.headers.location = toProxiedUrl(
                url.resolve(
                    target,
                    response.headers.location
                )
            );
        }
    }
}

function onHtmlResponse(request, response, cycle) {

    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.

    var target = request.fullUrl(),  // the user's desired webpage
        $ = response.$,              // Cheerio.js, the server-side jQuery
        baseTagUrl;                  // links are relative to this

    // TODO: Deal with the case where a base tag has already been set
    //       by the page and we should respect its value for relative
    //       links that we try to bypass / avoid.

    log.verbose('RESPONSE ------');
    log.verbose('Target :', target);
    // Decide whether configuration allows us to modify this content.
    if (!util.isEligible(request)) {
        log.warn(
            'An ineligible site was accessed:\n',
            target
        );
        log.verbose('------ RESPONSE');
        return;
    }
    // In reverse mode, we must re-write all URLs embedded within pages seen
    // by the user, such that we do not proxy content we would never alter,
    // such as images or stylesheets, even if they are relative links,
    // but anchor tags do go through the proxy, even if they are absolute.
    if (reverseMode) {

        // TODO: Use the csp module to conditionally add *.sitecues.com
        // to security policy, if needed.

        // Behavior for the first base tag with an href attribute.
        $('base[href]').eq(0).attr('href', function (index, value) {
            // Some sites use relative base tags, so we must compute
            // its meaning for it to be useful.
            var absoluteUrl = url.resolve(target, value),
                result;

            // The W3C spec says to respect the first encountered base tag href,
            // so we must be careful to save this only once.
            baseTagUrl = absoluteUrl;

            // Decide whether configuration allows us to proxy page links.
            // Even if not, we must ensure the final value is absolute,
            // so it cannot accidentally be relative to the proxy.
            result = proxyLinks ? toProxiedUrl(absoluteUrl) : absoluteUrl;

            return result;
        });

        // If a base was not declared by the page, we must fallback to using
        // one of our own, based on the configuration for proxying links.
        if (typeof baseTagUrl === 'undefined') {
            log.verbose(
                'final base:',
                proxyLinks ? toProxiedUrl(target) : target
            );
            $('head').prepend(
                '<base href=\"' +
                (proxyLinks ? toProxiedUrl(target) : target) +
                '\">'
            );
        }

        if (proxyLinks) {
            // Behavior for anchors with an href attribute.
            $('a[href]').attr('href', function (index, value) {

                var result = value;  // assume we don't want to change it

                if (value.length > 0) {
                    if (util.isAbsoluteUrl(value)) {
                        // Force proxying of links which might get clicked, etc.
                        result = toProxiedUrl(value);
                    }
                    else if (util.isRootRelative(value)) {
                        result = toProxiedUrl(
                            url.resolve(baseTagUrl || target, value)
                        );
                    }
                }

                return result;
            });
        }

        // Bypass the proxy for content we would never alter, such as
        // images and stylesheets. This enhances performance,
        // but also avoids accidentally corrupting data.

        // Behavior for CSS stylesheets with an href attribute.
        $('link[href]').attr('href', function (index, value) {
            var result = value;
            if (value.length > 0) {
                // Bypass the proxy entirely for downloading stylesheets.
                result = url.resolve(baseTagUrl || target, value);
            }
            return result;
        });

        // Behavior for all elements with an href attribute.
        $('*[href]').attr('href', function (index, value) {
            var result = value;
            if (value.length && util.isRootRelative(value)) {
                result = url.resolve(baseTagUrl || target, value);
            }
            return result;
        });

        // Behavior for all elements with a src attribute.
        $('*[src]').attr('src', function (index, value) {
            var result = value;
            if (value.length > 0) {
                // Bypass the proxy entirely for downloading media content,
                // to avoid accidentally corrupting it.
                result = url.resolve(baseTagUrl || target, value);
            }
            return result;
        });

        $('head').prepend(
            '<link rel="icon" href="/lalala.png">'
        );
    }

    if (state.removeLoadScript) {
        // Remove any existing sitecues load scripts, to avoid conflicts.
        $('script[data-provider="sitecues"]').remove();
    }

    // Inject our desired sitecues load script.
    $('head').eq(0).append(loadScript);

    log.verbose('------ RESPONSE');
}

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
                    'The sitecues proxy ' + that.name + ' is already ' + inProgress + '.'
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

    proxy = this._proxy;

    proxy.log('error warn debug', function (event) {

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
        console.log('event.error.stack');
        console.log(event.error.stack);

        // OLD WAY
        log.error(
            event.level[0].toUpperCase() + event.level.slice(1) + ': ' +
            event.message[0].toUpperCase() + event.message.slice(1)
        );
        if (event.error && !util.isTrivialError(error)) {
            log.error(event.error.stack);
        }

        // NEW WAY
        // TODO: Deal with the case where the event is not an error
        function capitalize(input) {
            return input[0].toUpperCase() + input.slice(1);
        }

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
    });
    proxy.log('info', function (event) {
        // ignore the first info log, which shows the listening port
        // and therefor duplicates something we do ourselves
        if (infoTimes > 0) {
            log.info(
                event.level + ': ' + event.message
            );
        }
        infoTimes = infoTimes + 1;
    });

    // Register handlers for altering data in-transit between
    // client and server.

    proxy.intercept(
        {
            phase    : 'request',
            protocol : /^https?/,
            url      : state.contextPath + 'status'
        },
        onStatusRequest  // callback to run if all conditions above are met
    );

    proxy.intercept(
        {
            phase    : 'request',  // run before we send data to the target
            protocol : /^https?/   // only run if using HTTP(S)
        },
        onRequest  // callback to run if all conditions above are met
    );
    proxy.intercept(
        {
            phase    : 'response'
        },
        onResponse
    );
    proxy.intercept(
        {
            phase    : 'response',   // run before we send data to the client
            as       : '$',          // construct a DOM from the page
            mimeType : /x?html/,     // only run if response is HTML
            protocol : /^https?/     // only run if using HTTP(S)
        },
        onHtmlResponse  // callback to run if all conditions above are met
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
