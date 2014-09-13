// This is the main entry point to our application,
// running it with node will start it up.

'use strict';

// Get instances of packages we depend on
// and set up internal variables...
var http          = require('http'),
    express       = require('express'),
    httpProxy     = require('http-proxy'),
    modifications = [],  // list of all changes we are making to documents
    enable        = {},
    message       = {},
    proxy, //
    server, // the origin server for documents, for proof of concept purposes
    app, // will be the initialized instance of Express
    page, // a fake page, solely for proof of concept purposes
    loadScript, // the load script for sitecues the proxy will inject
    tagline, // a visual change, to verify proxy behavior
    port       = process.env.PORT || 8000, // set the proxy port number
    serverPort = process.env.SERVERPORT || 9000; // set the basic HTTP server port number

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
        target: 'http://127.0.0.1:' + serverPort
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
app.listen(port);
console.log('The sitecues® proxy is on port ' + port + '.');


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
server.listen(serverPort);
console.log('A basic HTTP server is on port ' + serverPort + '.');
