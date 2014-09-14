// This is the main entry point to our application,
// running it with node will start it up.

'use strict';

// Get instances of packages we depend on
// and set up internal variables...
var http          = require('http'),
    express       = require('express'),
    httpProxy     = require('http-proxy'),
    portscanner   = require('portscanner'),
    modifications = [],  // list of all changes we are making to documents
    enable        = {},
    message       = {},
    proxy, //
    server, // the origin server for documents, for proof of concept purposes
    app, // will be the initialized instance of Express
    page, // a fake page, solely for proof of concept purposes
    loadScript, // the load script for sitecues the proxy will inject
    tagline, // a visual change, to verify proxy behavior
    host = process.env.HOST || '127.0.0.1',
    minPort    = 1024, // anything less than 1024 needs sudo on *nix and OS X
    maxPort    = 65535, // most systems will not accept anything greater than 65535
    defaultPort = 8000,
    defaultServerPort = defaultPort + 1000,
    port = sanitizePort(process.env.PORT, minPort, maxPort, defaultPort), // set the proxy port number we will attempt to use
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

    var fallbackType = typeof fallback,
        validFallbacks = [
            'string',
            'number',
            'function'
        ],
        dataInt = parseInt(data, 10), // either an integer or NaN
        result;

    data = dataInt >= 0 ? dataInt : data, // avoid NaN and modify to the integer form, if possible
    min  = parseInt(min, 10); // NaN is good here because of how we use > and < later
    max  = parseInt(max, 10); // NaN is good here because of how we use > and < later

    // make sure the fallback is a supported type...
    if (validFallbacks.indexOf(fallbackType) >= 0) {
        // make sure its not an empty string...
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
    if ((data === min || data === max) || (data && data > min && data < max)) {
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
        if (dataInt >= 0) {
            console.log(
                'Port ' + data + ' is not in the desired range of ' + min + '-' + max +
                '. Attempting to use ' + result + ' instead.'
            );
        }
    }

    return result;
}

enable.query = 'head'; // CSS selector to match
enable.func = function (node) {
    node.createWriteStream().end(loadScript);
};
message.query = '.desc'; // CSS selector to match
message.func = function (node) {
    node.createWriteStream().end(tagline);
};

modifications.push(enable, message);

proxy = httpProxy.createProxyServer(
    {
        target: 'http://' + host + ':' + serverPort
    }
);

//
// Set up our Express app
//
app = express();

// Make the Express app use the desired middleware...
app.use(require('harmon')([], modifications));
app.use(
    function (req, res) {
        proxy.web(req, res);
    }
);

// START THE PROXY
// =============================================================================
// asynchronously find an available port in the given range...
portscanner.findAPortNotInUse(port, maxPort, host, function(error, foundPort) {
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

// START THE SERVER
// =============================================================================
portscanner.findAPortNotInUse(serverPort, maxPort, host, function(error, foundPort) {
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
    }
});
