
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
    url             = require('url'),              // helper utilities for URL formatting
    log             = util.log,
    loadScript      = util.getLoadScript(),        // the sitecues loader, which the proxy will insert
    proxy,          // represents the server instance to connect to for using sitecues
    verbose,        // boolean flag to ask for extra logging
    hostname,       // domain or IP of the proxy
    MIN_PORT        = 1024,   // anything less than 1024 needs sudo on *nix and OS X
    MAX_PORT        = 65535,  // most systems will not accept anything greater than 65535
    DEFAULT_PORT    = 8000,   // port for the proxy if none is provided
    reverseMode,
    PROXY_LINKS     = false,  // whether to transform page links into proxy links
    target,                   // the user's desired webpage
    port,
    APP_NAME        = pkg.name,
    VERSION         = pkg.version,
    TEST_FLAG_NAME  = 'SITECUES-TEST',  // all requests to our own servers are flagged as a test session via this HTTP header
    TEST_FLAG_VALUE = 'TRUE; PROXY',    // the value for our test flag HTTP header, to isolate this app in metrics reports
    CONTEXT_PATH,                       // the root of all proxy functionality
    PAGE_API_PATH   = 'page/',          // special route dedicated to reverse proxying pages
    // TODO: This code also exists /index.js, DRY it up.
    defaultPorts    = {
        forward : 8000
    };

defaultPorts.reverse = defaultPorts.forward + 1;

// TODO: Streamline configuration vs state and move this out into a utility module.
function getProxyUrl(target) {

    var result = 'http://' + hostname + ':' + port + CONTEXT_PATH + PAGE_API_PATH + target;

    return result;
}

function onStatusRequest(request, response) {

    // This function runs when /status is visited.

    var time = (new Date()).toISOString(),
        status = {
            app        : APP_NAME,
            version    : VERSION,
            status     : 'OK',
            statusCode : 200,
            time       : time
        };

    log.ok(
        'A heartbeat check was requested.\n' +
        JSON.stringify(status, undefined, 4)
    );

    response.json = status;
}

function onRequest(request, response) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    var target = request.url,  // path of the request (following the proxy domain)
        targetCruft = new RegExp('^' + CONTEXT_PATH + '(?:' + PAGE_API_PATH + ')?');

    log.ok('REQUEST ------');

    // Extract the desired target from Page API requests by removing everything else.
    target = target.replace(targetCruft, '');
    // Default the target to HTTP, in case a user was lazy when typing it in.
    target = target.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');

    // In reverse mode, requests always point to the domain of the proxy itself,
    // and the target is in the path, so we must route traffic based on that.
    if (reverseMode) {
        log.ok('Proxy path :', request.url);
        log.ok('Target     :', target);

        // TODO: Deal with extraneous /favicon.ico requests, which error.

        // Redirect traffic to the URL given in the path.
        request.fullUrl(target);
    }
    // If connecting to a sitecues domain...
    if (request.hostname.indexOf('sitecues') >= 0) {
        // Send a header indicating that this is a test session...
        request.headers[TEST_FLAG_NAME] = TEST_FLAG_VALUE;
    }

    log.ok('------ REQUEST');
}

function onResponse(request, response) {

    // This function is designed to carry out behavior desirable for ALL responses,
    // regardless of protocol, Content-Type, or other filters.

    var target = request.fullUrl();

    // Detect HTTP redirect responses, which would send the user away from the proxy.
    if (['301', '302', '303', '307', '308'].indexOf(response.statusCode.toString()) >= 0) {
        // Re-write HTTP redirects to use the proxy.
        // These can be relative, so we must resolve them from the original target.
        response.headers.location = getProxyUrl(
            url.resolve(
                target,
                response.headers.location
            )
        );
    }
}

function onHtmlResponse(request, response) {

    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.

    var target = request.fullUrl(),  // the user's desired webpage
        $ = response.$,              // Cheerio.js, the server-side jQuery
        baseTagUrl;                  // if this is set, all relative links should be resolved against it

    // TODO: Deal with the case where a base tag has already been set by the page and we
    //       should respect its value for relative links that we try to bypass / avoid.

    log.ok('RESPONSE ------');
    log.ok('Target :', target);
    // Decide whether configuration allows us to modify this content.
    if (!util.isEligible(request)) {
        log.warn(
            'An ineligible site was accessed:\n',
            target
        );
        log.ok('------ RESPONSE');
        return;
    }
    // In reverse mode, we must re-write all URLs embedded within pages seen by the user, such that
    // we do not proxy content we would never alter, such as images or stylesheets, even if they
    // are relative links, but anchor tags do go through the proxy, even if they are absolute.
    if (reverseMode) {
        // Behavior for base tags with an href attribute.
        $('base[href]').attr('href', function (index, value) {
            // Some sites use relative base tags, so we must compute its meaning for it to be useful.
            var absoluteUrl = url.resolve(target, value),
                result;

            // The W3C spec says to respect the first encountered base tag href,
            // so we must be careful to save this only once.
            if (typeof baseTagUrl === 'undefined') {
                baseTagUrl = absoluteUrl;
            }

            // Decide whether configuration allows us to proxy page links.
            // Even if not, we must ensure the final value is absolute,
            // so it cannot accidentally be relative to the proxy.
            result = PROXY_LINKS ? getProxyUrl(absoluteUrl) : absoluteUrl;

            return result;
        });

        // If a base was not declared by the page, we must fallback to using
        // one of our own, based on the configuration for proxying links.
        if (typeof baseTagUrl === 'undefined') {
            $('head').prepend(
                '<base href=\"' + (PROXY_LINKS ? getProxyUrl(target) : target) + '\"></base>'
            );
        }

        // Behavior for anchors with an href attribute.
        $('a[href]').attr('href', function (index, value) {

            var result = value;  // assume we don't want to change it

            if (value.length > 0 && PROXY_LINKS) {
                if (util.isAbsoluteUrl(value)) {
                    // Force proxying of links which might get clicked, etc.
                    result = getProxyUrl(value);
                }
                else if (util.isRootRelative(value)) {
                    result = getProxyUrl(
                        url.resolve(baseTagUrl || target, value)
                    );
                }
            }

            return result;
        });

        // Bypass the proxy for content we would never alter, such as images and stylesheets.
        // This is a performance optimization, but also avoids accidentally corrupting data.

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
    }

    // Remove any existing sitecues load scripts, to avoid conflicts.
    $('script[data-provider="sitecues"]').remove();
    // Inject our desired sitecues load script.
    $('head').eq(0).append(loadScript);

    log.ok('------ RESPONSE');
}

function onListening() {

    // This function is run when the proxy is up and ready to accept connections.

    log.ok(
        'The sitecues®' + (reverseMode ? ' reverse' : '') + ' proxy is on port ' + port + '.'
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
                phase    : 'response'
            },
            onResponse
        )
        proxy.intercept(
            {
                phase    : 'response',   // run before we send anything back to the client
                as       : '$',          // ask for a cheerio object, to manipulate the DOM
                mimeType : /x?html|xml/, // only run if response is HTML
                protocol : /^https?/     // only run if using HTTP(S)
            },
            onHtmlResponse  // callback to be run when all of the above conditions are met
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
            CONTEXT_PATH = options.contextPath;
            hostname     = options.hostname;
            target       = options.target;
            verbose      = options.verbose;
            port         = options.port;
            if (typeof port === 'string' && options.port.trim().toLowerCase().indexOf('auto') === 0) {
                port = defaultPorts[options.direction];
                // Asynchronously find an available port in the given range
                // and start the proxy when that is finished.
                portscanner.findAPortNotInUse(port, MAX_PORT, '127.0.0.1', startProxy);
            }
            else {
                port = util.sanitizePort(port, MIN_PORT, MAX_PORT, DEFAULT_PORT);
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
        if (typeof callback === 'function') {
            // Stop accepting new connections.
            proxy.close(
                callback.bind(proxy)
            );
        }
        else {
            proxy.close();
        }
    }
}

module.exports = {
    start : start,
    stop  : stop
};
