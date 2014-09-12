'use strict';

var http          = require('http'),
    connect       = require('connect'),
    httpProxy     = require('http-proxy'),
    modifications = [],
    enable        = {},
    message       = {},
    proxy,
    server,
    app,
    page,
    loadScript,
    tagline;

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
        target: 'http://localhost:9000'
    }
);

//
// Basic Connect App
//
app = connect();

app.use(require('harmon')([], modifications));
app.use(
    function (req, res) {
        proxy.web(req, res);
    }
);
app.listen(8000);

// Server for the original content...
server = http.createServer(
    function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(page);
        res.end();
    }
);
server.listen(9000);
