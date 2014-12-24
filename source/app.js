// This is the main entry point to our application,
// running it with node will start it up.

'use strict';

// Get instances of modules we depend on...
// and set up internal variables...
var portscanner   = require('portscanner'), // utility to find available ports
    hoxy          = require('hoxy'),        // utility to create the proxy
    util          = require('./util'),      // internal project utilities
    loadScript    = util.getLoadScript(),   // the sitecues load script, which the proxy will insert
    proxy,        // represents the actual server to connect to for sitecues testing
    verbose       = process.env.VERBOSE,    // truthiness flag to say that extra logging is desiraed
    hostname      = process.env.HOSTNAME || '127.0.0.1',  // where to attach the proxy
    minPort       = 1024,  // anything less than 1024 needs sudo on *nix and OS X
    maxPort       = 65535, // most systems will not accept anything greater than 65535
    defaultPort   = 8000,  // port for the proxy if none is provided
    port          = util.sanitizePort(process.env.PORT, minPort, maxPort, defaultPort), // set the proxy port number we will attempt to use
    testFlagName  = 'SITECUES.TEST', // HTTP header to send, indicating we are testing
    testFlagValue = 'TRUE; QA PROXY'; // HTTP header value to send, indicating what kind of testing this is

function startProxy(error, foundPort) {

    // This function takes all steps necessary to initialize the proxy.

    var infoTimes = 0; // counter to ignore first info log from proxy

    if (error) {
        console.error(
            new Date().toISOString(),
            'Port scanner error...', error
        );
    }
    else {
        if (foundPort !== port) {
            console.log(
                new Date().toISOString(),
                'Port ' + port + ' is not available. Using ' + foundPort +
                ' instead, which is the next one free.'
            );
        }
        port = foundPort;

        proxy = new hoxy.Proxy();

        proxy.log('error warn debug', function (event) {
            console.error(
                new Date().toISOString(),
                event.level[0].toUpperCase() + event.level.slice(1) + ': ' +
                event.message[0].toUpperCase() + event.message.slice(1)
            );
            if (event.error) {
                console.error(event.error.stack);
            }
        });
        proxy.log('info', function (event) {
            // ignore the first info log, which shows the listening port
            // and therefor duplicates something we do ourselves
            if (infoTimes > 0) {
                console.log(
                    new Date().toISOString(),
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
            function (req, resp) {
                // if it is a sitecues domain...
                if (req.hostname.indexOf('sitecues') >= 0) {
                    // send a header indicating that this is a test session...
                    req.headers[testFlagName] = testFlagValue;
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
                // Decide whether configuration allows us to modify this page...
                if (util.isEligible(req)) {
                    // Remove any existing sitecues load scripts, to avoid conflicts...
                    resp.$('script[data-provider="sitecues"]').remove();
                    // Inject our desired sitecues load script...
                    resp.$('head').eq(0).append(loadScript);
                }
            }
        );

        proxy.listen(port, function () {
            console.log(
                new Date().toISOString(),
                'The sitecues® proxy is on port ' + port + '.'
            );
        });
        // TODO: Get local changes to proxy.close() merged upstream,
        //       to log messages and be consistent with .listen()
    }
}

// LAUNCH THE PROXY
// =============================================================================
// asynchronously find an available port in the given range...
portscanner.findAPortNotInUse(port, maxPort, hostname, startProxy);
