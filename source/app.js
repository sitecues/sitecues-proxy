// This is the main entry point to our application,
// running it with node will start it up.

'use strict';

// Get instances of packages we depend on
// and set up internal variables...
var http          = require('http'),
    express       = require('express'),
    harmon        = require('harmon'),
    httpProxy     = require('http-proxy'),
    portscanner   = require('portscanner'),
    loadScript,   // the load script for sitecues, which the proxy will inject
    tagline,      // a simple piece of text to display, to verify proxy behavior
    modifications = [], // list of all changes we are making to documents
    proxy,      // configuration to enable proxy behavior
    server,     // the origin server for documents, for proof of concept purposes
    app,        // the Express server launched to host the proxy
    page,       // a fake page, solely for proof of concept purposes
    verbose     = process.env.VERBOSE,
    host        = process.env.HOST || '127.0.0.1',
    minPort     = 1024,  // anything less than 1024 needs sudo on *nix and OS X
    maxPort     = 65535, // most systems will not accept anything greater than 65535
    defaultPort = 8000,  // port for the proxy if none is provided
    defaultServerPort = defaultPort - 1000, // port for the server if none is provided
    port       = sanitizePort(process.env.PORT, minPort, maxPort, defaultPort), // set the proxy port number we will attempt to use
    serverPort = sanitizePort(process.env.SERVERPORT, minPort, maxPort, defaultServerPort); // set the basic HTTP server port number we will attempt to use

page = '' +
    '<!DOCTYPE html>\n'                +
    '<html>\n'                         +
    '    <head>\n'                     +
    '    </head>\n'                    +
    '    <body>\n'                     +
    '        <div class=\"intro\">\n'  +
    '            Future Aweseomness\n' +
    '        </div>\n'                 +
    '        <div class=\"desc\">\n'   +
    '            blah\n'               +
    '        </div>\n'                 +
    '    </body>\n'                    +
    '</html>';

loadScript = '' +
    '\n        <script data-provider=\"sitecues\" type=\"text/javascript\">\n'    +
    '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n' +
    '            var sitecues = window.sitecues || {};\n\n'                       +
    '            sitecues.config = {\n'                                           +
    '                site_id : \'s-00000005\'\n'                                  +
    '            };\n\n'                                                          +
    '            (function () {\n'                                                +
    '                var script = document.createElement(\'script\'),\n'          +
    '                first = document.getElementsByTagName(\'script\')[0];\n'     +
    '                sitecues.config.script_url=document.location.protocol+'      +
                         '\'//js.sitecues.com/l/s;id=\'+sitecues.config.site_id+' +
                         '\'/js/sitecues.js\';\n'                                 +
    '                script.type = \'text/javascript\';\n'                        +
    '                script.async = true;\n'                                      +
    '                script.src=sitecues.config.script_url;\n'                    +
    '                first.parentNode.insertBefore(script, first);\n'             +
    '            })();\n'                                                         +
    '        </script>\n    ';

tagline = 'brought to you by sitecues&reg;';

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

// register all of the page changes we want to make...
modifications = [
    {
        query : 'head',  // CSS selector to match
        func  : function (node) {  // what to do with it, when found
            node.createWriteStream().end(loadScript); // inject the load script into the DOM node
        }
    },
    {
        query : '.desc',
        func  : function (node) {
            node.createWriteStream().end(tagline); // write the tagline to the DOM node
        }
    }
]

// Set up our Express app...
app = express();

// Make the Express app use the desired middleware...
app.use(
    harmon([], modifications)
);
app.use(
    function (req, res) {
        proxy.web(req, res);
    }
);

// CREATE THE SERVER
// =============================================================================
// Make a basic HTTP server for the original content...
server = http.createServer(
    function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(page);
        res.end();
    }
);

function launchServerAndProxy(error, foundPort) {

    // This function is designed to ensure that the server and
    // proxy are asynchronously started in the proper order

    if (error) {
        console.error('Port scanner error... ' + error);
    }
    else {
        if (foundPort !== serverPort) {
            console.log(
                'Port ' + serverPort + ' is not available. Using ' + foundPort +
                ' instead, which is the next one free.'
            );
        }
        serverPort = foundPort;
        server.listen(serverPort, function () {
            console.log('A basic HTTP server is on port ' + serverPort + '.');
        });

        proxy = httpProxy.createProxyServer(
            {
                target: 'http://' + host + ':' + serverPort
            }
        );

        // asynchronously find an available port in the given range...
        portscanner.findAPortNotInUse(port, maxPort, host, function (error, foundPort) {
            if (error) {
                console.error('Port scanner error... ' + error);
            }
            else {
                if (foundPort !== port) {
                    console.log(
                        'Port ' + port + ' is not available. Using ' + foundPort +
                        ' instead, which is the next one free.'
                    );
                }
                port = foundPort;
                app.listen(port, function () {
                    console.log('The sitecues® proxy is on port ' + port + '.');
                });
            }
        });
    }
}

// LAUNCH THE SERVER AND PROXY
// =============================================================================
portscanner.findAPortNotInUse(serverPort, maxPort, host, launchServerAndProxy);
