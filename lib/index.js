
// This is the main entry point to our application,
// running it with node will start the proxy.

// We deploy this to proxy.sitecues.com, but it works locally as well.

'use strict';

// Get instances of modules we depend on
// and set up internal configuration...
var pkg             = require('../package.json'),  // metadata about the proxy application
    portscanner     = require('portscanner'),      // utility to find available ports for the proxy to listen on
    hoxy            = require('hoxy'),             // utility to create and control the proxy server
    util            = require('./util').general,   // internal project utilities
    log             = util.log,
    loadScript      = util.getLoadScript(),        // the sitecues loader, which the proxy will insert
    proxy,          // represents the server instance to connect to for using sitecues
    verbose,        // boolean flag to ask for extra logging
    hostname,       // where to attach the proxy
    MIN_PORT        = 1024,  // anything less than 1024 needs sudo on *nix and OS X
    MAX_PORT        = 65535, // most systems will not accept anything greater than 65535
    DEFAULT_PORT    = 8000,  // port for the proxy if none is provided
    reverseMode,
    target,
    port,
    APP_NAME        = pkg.name,
    VERSION         = pkg.version,
    TEST_FLAG_NAME  = 'SITECUES-TEST',  // all requests from this proxy to our own servers are flagged as a test session via this HTTP header
    TEST_FLAG_VALUE = 'TRUE; PROXY',    // the value for our test flag HTTP header, to isolate this app in metrics reports
    CONTEXT_PATH,            // the root of all proxy functionality
    PAGE_API_PATH   = 'page/'

function onStatusRequest(request, response) {

    // This function runs when /status is visited.

    var time = (new Date()).toISOString();

    console.log('Matched status route!');
    response.json = {
        app        : APP_NAME,
        version    : VERSION,
        status     : 'OK',
        statusCode : 200,
        time       : time
    };
}

function onRequest(request, response) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    var target = request.url,
        lengthToStrip = 1;  // assume we just need to strip leading slash '/'

    // Detect page API requests.
    if (target.indexOf(CONTEXT_PATH + PAGE_API_PATH) === 0) {
        console.log('Changing target!');
        lengthToStrip = (CONTEXT_PATH + PAGE_API_PATH).length
    }
    target = target.substring(lengthToStrip);

    // In reverse mode, requests always point to the domain of the proxy itself,
    // and the target is in the path, so we must route traffic based on that.
    if (reverseMode) {
        console.log('req.fullUrl:', request.fullUrl());
        console.log('req.url:', request.url);
        console.log('target:', target);
        console.log('context path:', CONTEXT_PATH);
        console.log('page API path:', PAGE_API_PATH);
        // if it is an absolute link, redirect traffic to the URL given in the path......
        if (target.indexOf('http://') === 0 || target.indexOf('https://') === 0) {
            console.log('target started with http or https! changing destination...');
            request.fullUrl(  // change the destination
                target
            );
        }
    }

    // If connecting to a sitecues domain...
    if (request.hostname.indexOf('sitecues') >= 0) {
        // Send a header indicating that this is a test session...
        request.headers[TEST_FLAG_NAME] = TEST_FLAG_VALUE;
    }
}

function onResponse(request, response) {

    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.

    // Decide whether configuration allows us to modify this content...
    if (util.isEligible(request)) {
        // In reverse mode, we must re-write all URLs embedded within pages seen by the user, such that
        // we do not proxy content we would never alter, such as videos or stylesheets, even if they
        // are relative links, but anchor tags do go through the proxy, even if they are absolute.
        if (reverseMode) {
            // rules for images with a src attribute...
            response.$('img[src]').attr('src', function (index, value) {
                if (value.length > 0) {
                    // bypass the proxy entirely for downloading images...
                    return request.fullUrl() + value;
                }
            });
            // rules for anchors with an href attribute...
            response.$('a[href]').attr('href', function (index, value) {

                var result = value;  // assume we don't want to change it

                if (value.length > 0 && util.isAbsoluteUrl(value)) {
                    // force proxying of links, etc.
                    // TODO: Compute the proxy location instead of this complex concatenation...
                    result = 'http://' + hostname + port + '/' + CONTEXT_PATH + value;
                }

                return result;
            });
        }

        // Remove any existing sitecues load scripts, to avoid conflicts...
        response.$('script[data-provider="sitecues"]').remove();
        // Inject our desired sitecues load script...
        response.$('head').eq(0).append(loadScript);
    }
    else {
        log.warn(
            'An ineligible site was accessed:\n',
            request.fullUrl()
        );
    }
}

function onListening() {

    // This function is run when the proxy is up and ready to accept connections.

    log.ok(
        'The sitecues® proxy is on port ' + port + '.'
    );
}

function startProxy(error, foundPort) {

    // This function takes all steps necessary to initialize the proxy.

    var infoTimes = 0;  // counter to ignore first info log from proxy

    if (error) {
        log.error(
            'Port scanner error...', error
        );
    }
    else {
        if (foundPort !== port) {
            log.warn(
                'Port ' + port + ' is not available. Using ' + foundPort +
                ' instead, which is the next one free.'
            );
        }
        port = foundPort;

        if (reverseMode) {
            proxy = new hoxy.Proxy(
                {
                    // Here we tell the proxy which webpage is the default target when it enters reverse mode,
                    // we override this for each request and you should never actually see it, but it is
                    // necessary configuration to actually enter reverse mode.
                    reverse: target
                }
            );
        }
        else {
            proxy = new hoxy.Proxy();
        }

        proxy.log('error warn debug', function (event) {
            log.error(
                event.level[0].toUpperCase() + event.level.slice(1) + ': ' +
                event.message[0].toUpperCase() + event.message.slice(1)
            );
            if (event.error && !util.isTrivialError(error)) {
                log.error(event.error.stack);
            }
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

        // --- Intercepts, which can alter data in-transit between client and server...

        proxy.intercept(
            {
                phase    : 'request',
                protocol : /^https?/,
                url      : CONTEXT_PATH + 'status'
            },
            onStatusRequest
        );

        proxy.intercept(
            {
                phase    : 'request',  // run before we send anything to the target server
                protocol : /^https?/   // only run if using HTTP(S)
            },
            onRequest  // callback to be run when all of the above conditions are met
        );

        proxy.intercept(
            {
                phase    : 'response',   // run before we send anything back to the client
                as       : '$',          // ask for a cheerio object, to manipulate the DOM
                mimeType : /x?html|xml/, // only run if response is HTML
                protocol : /^https?/     // only run if using HTTP(S)
            },
            onResponse  // callback to be run when all of the above conditions are met
        );

        proxy.listen(
            port,        // port to listen on
            onListening  // callback to run when the proxy is ready for connections
        );
    }
}

function start(options, callback) {
    var alreadyUp = proxy ? true : false;
    // Make sure we have not already started.
    if (!alreadyUp) {
        if (options) {
            if (options.direction === 'reverse') {
                reverseMode = true;
            }
            target   = options.target;
            hostname = options.hostname;
            verbose  = options.verbose;
            CONTEXT_PATH = options.contextPath;
            if (typeof options.port === 'string' && options.port.trim().toLowerCase().indexOf('auto') === 0) {
                // Asynchronously find an available port in the given range
                // and start the proxy when that is finished.
                portscanner.findAPortNotInUse(DEFAULT_PORT, MAX_PORT, hostname, startProxy);
            }
            else {
                port = util.sanitizePort(options.port, MIN_PORT, MAX_PORT, DEFAULT_PORT);
                // Launch the proxy using a specific port.
                process.nextTick(
                    startProxy.bind(proxy, undefined, port)
                );
            }
        }
    }

    if (typeof callback === 'function') {
        if (alreadyUp) {
            callback = callback.bind(proxy, new Error('Proxy already started.'));
        }
        else {
            callback = callback.bind(proxy);
        }
        process.nextTick(callback);
    }

    return proxy;
}

function stop(callback) {
    // Make sure there's a proxy to stop.
    if (proxy) {
        // Stop accepting new connections.
        proxy.close(
            callback.bind(proxy)
        );
    }
}

module.exports = {
    start : start,
    stop  : stop
};
