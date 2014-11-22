// This is the main entry point to our application,
// running it with node will start it up.

'use strict';

// Get instances of packages we depend on
// and set up internal variables...
var portscanner = require('portscanner'), // utility to find available ports
    http        = require('http'),        // utility to create a debugging server
    hoxy        = require('hoxy'),        // utility to create the actual proxy
    loadScript,  // the load script for sitecues, which the proxy will insert
    proxy,       // represents the server to connect to for sitecues testing
    proxyUrl,    // the absolute URL of the proxy, which cannot be known until runtime
    contentRoot = 'http://www.example.com',
    verbose     = process.env.VERBOSE,
    hostname    = process.env.HOSTNAME || '127.0.0.1',
    minPort     = 1024,  // anything less than 1024 needs sudo on *nix and OS X
    maxPort     = 65535, // most systems will not accept anything greater than 65535
    defaultPort = 8000,  // port for the proxy if none is provided
    port        = sanitizePort(process.env.PORT, minPort, maxPort, defaultPort), // set the proxy port number we will attempt to use

loadScript = '' +
    '\n        <script data-provider=\"sitecues-proxy\" type=\"text/javascript\">\n'    +
    '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n' +
    '            var sitecues = window.sitecues || {};\n\n'                       +
    '            sitecues.config = {\n'                                           +
    '                site_id : \'s-00000005\'\n'                                  +
    '            };\n\n'                                                          +
    '            (function () {\n'                                                +
    '                var script = document.createElement(\'script\'),\n'          +
    '                first = document.getElementsByTagName(\'script\')[0];\n'     +
    '                sitecues.config.script_url=document.location.protocol+'      +
                         '\'//js.dev.sitecues.com/l/s;id=\'+sitecues.config.site_id+' +
                         '\'/v/dev/latest/js/sitecues.js\';\n'                                 +
    '                script.type = \'text/javascript\';\n'                        +
    '                script.async = true;\n'                                      +
    '                script.src=sitecues.config.script_url;\n'                    +
    '                first.parentNode.insertBefore(script, first);\n'             +
    '            })();\n'                                                         +
    '        </script>\n    ';

function sanitizePort(data, min, max, fallback) {

    // This function is designed to be a re-usable API to get
    // a sensible port number, based on user input

    var fallbackType = typeof fallback,
        validFallbacks = [
            'string',
            'number',
            'function'
        ],
        dataInt = parseInt(data, 10), // either an integer or NaN
        result;

    data = dataInt >= 0 ? dataInt : data, // use integer, if possible, otherwise leave alone for logging purposes
    min  = parseInt(min, 10); // NaN is fine here because of how we use > and < later
    max  = parseInt(max, 10); // NaN is fine here because of how we use > and < later

    // make sure the fallback is a supported type...
    if (validFallbacks.indexOf(fallbackType) >= 0) {
        // make sure it's not an empty string...
        if (fallbackType === 'string' && fallback.length) {
            // try to extract a number...
            fallback = parseInt(fallback, 10);
            // make sure it didn't come back as NaN, but we do support 0, which is falsy...
            if (!fallback && fallback !== 0) {
                fallback = defaultPort;
            }
        }
    }
    else {
        fallback = defaultPort;
    }

    // ports are allowed to exactly equal min or max, otherwise they
    // must be truthy AND be between min and max...
    if (data === min || data === max || (data && data > min && max > data)) {
        result = data;
    }
    else {
        if (fallbackType === 'function') {
            result = fallback();
        }
        else {
            result = fallback;
        }
        // logging the following is annoying if data is undefined, etc...
        if (dataInt >= 0 || verbose) {
            console.log(
                'Port ' + data + ' is not in the desired range of ' + min + '-' + max +
                '. Attempting to use ' + result + ' instead.'
            );
        }
    }

    return result;
}

function startProxy(error, foundPort) {

    // This function takes all steps necessary to initialize the proxy.

    var infoTimes = 0; // counter to ignore first info log from proxy

    if (error) {
        console.error('Port scanner error...', error);
    }
    else {
        if (foundPort !== port) {
            console.log(
                'Port ' + port + ' is not available. Using ' + foundPort +
                ' instead, which is the next one free.'
            );
        }
        port     = foundPort;
        proxyUrl = 'http://' + hostname + ':' + port;

        proxy = new hoxy.Proxy(
            {
                reverse: contentRoot
            }
        );

        proxy.log('error warn debug', function (event) {
            console.log(event);
            console.error(
                event.level[0].toUpperCase() + event.level.slice(1) + ': ' +
                event.message[0].toUpperCase() + event.message.slice(1)
            );
            if (event.error) {
                console.error(event.error.stack);
            }
        });
        proxy.log('info', function (event) {
            // ignore the first info log, which shows listening port (we do it ourselves)
            if (infoTimes > 0) {
                console.log(event.level + ': ' + event.message);
            }
            infoTimes = infoTimes + 1;
        });

        proxy.intercept(
            {
                phase    : 'request',  // run before we send anything to the target server
                protocol : /^https?/   // only run if using HTTP(S)
            },
            function (req, resp) {
                console.log('proxyURL:', proxyUrl);
                console.log('req.url:', req.url);
                console.log('req.url.slice(1):', req.url.slice(1));
                console.log('req.fullUrl:', req.fullUrl());
                // if it is an absolute link, redirect traffic to the URL given in the path......
                if (req.url.indexOf('http://') === 1 || req.url.indexOf('https://') === 1) {
                    console.log('Truthy!');
                    req.fullUrl(req.url.slice(1));
                }
            }
        );

        proxy.intercept(
            {
                phase    : 'response',   // run before we send anything back to the client
                as       : '$',          // ask for a cheerio object, to manipulate DOM
                mimeType : 'text/html',  // only run if response is HTML
                protocol : /^https?/     // only run if using HTTP(S)
            },
            function (req, resp) {
                // rules for images with a src attribute...
                resp.$('img[src]').attr('src', function (index, value) {
                    if (value.length > 0) {
                        // bypass the proxy entirely for downloading images...
                        return req.fullUrl() + value;
                    }
                });
                // rules for anything with an href attribute...
                resp.$('*[href]').attr('href', function (index, value) {
                    if (value.length > 0) {
                        // force proxying of links, etc.
                        return proxyUrl + '/' + value;
                    }
                });
                // Remove any existing sitecues load scripts, to avoid conflicts...
                resp.$('script[data-provider="sitecues"]').remove();
                // Inject our desired sitecues load script...
                resp.$('head').eq(0).append(loadScript);
            }
        );

        proxy.listen(port, function () {
            console.log('The sitecues® proxy is on port ' + port + '.');
        });
        // TODO: Get local changes to proxy.close() merged upstream,
        //       to log messages and be consistent with .listen()
    }
}

// LAUNCH THE PROXY
// =============================================================================
// asynchronously find an available port in the given range...
portscanner.findAPortNotInUse(port, maxPort, hostname, startProxy);
