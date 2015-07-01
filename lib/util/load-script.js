'use strict';

var sitecuesUrl = require('./sitecues-url'),
    url         = require('url');

function toString() {

    // Under the hood, an object's .toString() is used
    // when concatenating it. We can return whatever
    // representation we want here, but the most
    // useful is a string of the load script.

    return this.value;
}

function LoadScript(input) {

    var inputType = typeof input, config, urlOpts, scriptUrl, result;

    // Defensive: Object.create does not like undefined, etc. so we
    // give it a blank slate to start with in edge cases.
    if (!input || (inputType !== 'object' && inputType !== 'function')) {
        input = Object.prototype;
    }

    // Configuration for the load script inherits from the input, so that
    // we don't accidentally overwrite values on an object that belongs
    // to the outside world.
    config = Object.create(input);

    // Set default configuration options.
    if (!config.provider) {
        config.provider = 'sitecues-proxy';
    }
    if (!config.siteId) {
        config.siteId = 's-98595d91';  // special ID for the sitecues proxy
    }
    if (!config.mimeType) {
        config.mimeType = 'application/javascript';
    }

    // Sanitize the configuration.
    config = sitecuesUrl.sanitize(config);

    // Options for constructing the script URL inherit from the main configuration
    // so that we can tweak it slightly, while retaining the original.
    urlOpts = Object.create(config);

    // URL overrides. These are unique to how we want the script url
    // processed on the client side, to resemble a real customer.
    urlOpts.siteId = '\'+sitecues.config.siteId+\'';  // client computes the full URL
    urlOpts.protocol = 'https';                       // force high security

    // Compute the client-side URL string.
    scriptUrl = url.format(urlOpts);

    result =
        '\n        <script data-provider=\"' + config.provider + '\" type=\"' + config.mimeType + '\">\n' +
        '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n'  +
        '            var sitecues = window.sitecues = window.sitecues || {};\n'        +
        '            sitecues.config = sitecues.config || {};\n'                       +
        '            sitecues.config.siteId = \'' + config.siteId + '\';\n'            +
        '            sitecues.config.scriptUrl=\'' + scriptUrl + '\';\n'               +
        '            (function () {\n'                                                 +
        '                var script = document.createElement(\'script\'),\n'           +
        '                    first  = document.getElementsByTagName(\'script\')[0];\n' +
        '                script.type  = \'' + config.mimeType + '\';\n'                +
        '                script.async = true;\n'                                       +
        '                script.src   = sitecues.config.scriptUrl;\n'                  +
        '                first.parentNode.insertBefore(script, first);\n'              +
        '            })();\n'                                                          +
        '        </script>\n    ';

    // Save useful per-instance data for the outside world.
    this.config = config;
    this.value = result;
}

// Shared APIs, inherited by instances.
LoadScript.prototype.toString = toString;


// Public module API.
module.exports = LoadScript;
