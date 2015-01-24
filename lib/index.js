
// This is the main entry point to our application,
// running it with node will start the proxy.

// We deploy this to proxy.sitecues.com, but it works locally as well.

'use strict';

// Get instances of modules we depend on
// and set up internal configuration...
var portscanner   = require('portscanner'), // utility to find available ports for the proxy to listen on
    hoxy          = require('hoxy'),        // utility to create and control the proxy server
    util          = require('./util').general,  // internal project utilities
    loadScript    = util.getLoadScript(),   // the sitecues load script, which the proxy will insert
    proxy,        // represents the actual server to connect to for using sitecues
    verbose       = process.env.VERBOSE,    // boolean flag to ask for extra logging
    hostname      = process.env.HOSTNAME || '127.0.0.1',  // where to attach the proxy
    minPort       = 1024,  // anything less than 1024 needs sudo on *nix and OS X
    maxPort       = 65535, // most systems will not accept anything greater than 65535
    defaultPort   = 8000,  // port for the proxy if none is provided
    port          = util.sanitizePort(process.env.PORT, minPort, maxPort, defaultPort), // set the proxy port number we will attempt to use
    testFlagName  = 'SITECUES-TEST',  // all requests from this proxy to our own servers are flagged as a test session via this HTTP header
    testFlagValue = 'TRUE; PROXY',    // the value for our test flag HTTP header, to isolate this app in metrics reports
    log           = util.log;

function onRequest(request, response) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    // If connecting to a sitecues domain...
    if (request.hostname.indexOf('sitecues') >= 0) {
        // Send a header indicating that this is a test session...
        request.headers[testFlagName] = testFlagValue;
    }
}

function onResponse(request, response) {

    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.

    // Decide whether configuration allows us to modify this content...
    if (util.isEligible(request)) {
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

        proxy = new hoxy.Proxy();

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
                phase    : 'request',  // run before we send anything to the target server
                protocol : /^https?/   // only run if using HTTP(S)
            },
            onRequest  // callback to be run when all of the above conditions are met
        );

        proxy.intercept(
            {
                phase    : 'response',   // run before we send anything back to the client
                as       : '$',          // ask for a cheerio object, to manipulate the DOM
                mimeType : 'text/html',  // only run if response is HTML
                protocol : /^https?/     // only run if using HTTP(S)
            },
            onResponse  // callback to be run when all of the above conditions are met
        );

        proxy.listen(
            port,        // port to listen on
            onListening  // callback to run when the proxy is ready for connections
        );

        // TODO: Get local changes to proxy.close() merged upstream,
        //       to log messages and be consistent with .listen()
    }
}

// LAUNCH THE PROXY
// =============================================================================
// Asynchronously find an available port in the given range
// and start the proxy when that is finished...
portscanner.findAPortNotInUse(port, maxPort, hostname, startProxy);
