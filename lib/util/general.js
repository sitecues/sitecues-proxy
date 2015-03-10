//
// This module contains utilities for use by the sitecues proxy.
//

// NOTE: At the moment, many of these are experiments. They are not all used, especially in production.

// TODO: Clean up this module.

var whitelist     = require('../../config/whitelist'),
    blacklist     = require('../../config/blacklist'),
    isAbsoluteUrl = require('is-absolute-url'),
    log           = {},
    DEFAULT_PORT  = 8000,  // port for the proxy if none is provided
    verbose       = process.env.VERBOSE;

log.ok = function () {
    // here we simply want to add a date string to the beginning of arguments
    // and call console.log with that list

    // sadly, this requires some trickery...
    console.log.apply(console, [new Date().toISOString()].concat([].slice.call(arguments)));
};
log.warn = function () {
    console.warn.apply(console, [new Date().toISOString()].concat([].slice.call(arguments)));
};
log.info = function () {
    console.info.apply(console, [new Date().toISOString()].concat([].slice.call(arguments)));
};
log.error = function () {
    console.error.apply(console, [new Date().toISOString()].concat([].slice.call(arguments)));
};

function isTrue(input) {

    // Boolean deserialization...

    var choices = [
        true,
        'true',
        'yes',
        'on'
    ];

    return input ? choices.indexOf(typeof input.toLowerCase === 'function' ? input.toLowerCase() : input) >= 0 : false;
}

function isFalse(input) {

    // Boolean deserialization...

    var choices = [
        false,
        'false',
        'no',
        'off'
    ];

    // normalize...
    if (input && typeof input.toLowerCase === 'function') {
        input = input.toLowerCase();
    }

    return choices.indexOf(input) >= 0 || false;
}

function getPolarity(input) {

    var result;  // default is undefined

    if (isTrue(input)) {
        result = true;
    }
    else if (isFalse(input)) {
        result = false;
    }

    return result;
}

function sanitizePort(data, min, max, fallback) {

    // This function is designed to be a re-usable API to get
    // a sensible port number, based on user input

    var fallbackType = typeof fallback,
        validFallbackTypes = [
            'string',
            'number',
            'function'
        ],
        dataInt = parseInt(data, 10), // either an integer or NaN
        result;

    data = dataInt >= 0 ? dataInt : data; // use integer, if possible, otherwise leave alone for logging purposes
    min  = parseInt(min, 10); // NaN is fine here because of how we use > and < later
    max  = parseInt(max, 10); // NaN is fine here because of how we use > and < later

    // make sure the fallback is a supported type...
    if (validFallbackTypes.indexOf(fallbackType) >= 0) {
        if (fallbackType === 'string') {
            // try to extract a number...
            fallback = parseInt(fallback, 10);
            // check if it came back as NaN or +/-Infinity...
            if (!isFinite(fallback)) {
                fallback = DEFAULT_PORT;
            }
        }
    }
    else {
        fallback = DEFAULT_PORT;
    }

    // ports are allowed to exactly equal min or max, otherwise they
    // must be truthy AND be between min and max...
    if (data === min || data === max || (data && min < data && data < max)) {
        result = data;
    }
    else {
        if (fallbackType === 'function') {
            result = fallback(data, min, max);
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


function getLoadScript() {
    var result =
        '\n        <script data-provider=\"sitecues-proxy\" type=\"text/javascript\">\n'  +
        '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n'     +
        '            var sitecues = window.sitecues || {};\n\n'                           +
        '            sitecues.config = {\n'                                               +
        '                site_id : \'s-00000005\'\n'                                      +
        '            };\n\n'                                                              +
        '            (function () {\n'                                                    +
        '                var script = document.createElement(\'script\'),\n'              +
        '                first = document.getElementsByTagName(\'script\')[0];\n'         +
        '                sitecues.config.script_url=document.location.protocol+'          +
                             '\'//js.dev.sitecues.com/l/s;id=\'+sitecues.config.site_id+'     +
                             '\'/v/dev/latest/js/sitecues.js\';\n'                                     +
        '                script.type = \'text/javascript\';\n'                            +
        '                script.async = true;\n'                                          +
        '                script.src=sitecues.config.script_url;\n'                        +
        '                first.parentNode.insertBefore(script, first);\n'                 +
        '            })();\n'                                                             +
        '        </script>\n    ';
    return result;
}

function isEligible(req) {

    var result   = true,
        useRegex = REGEX_BY_DEFAULT = true,
        url      = req.fullUrl(),
        list, i, len, entry,
        pattern, flags;

    list = whitelist;
    len = list.length;
    for (i = 0; i < len; i = i + 1) {
        entry    = list[i];
        pattern  = entry.url;
        flags    = entry.flags && typeof entry.flags === 'string' ? entry.flags : undefined;
        useRegex = typeof entry.regex === 'boolean' ? entry.regex : entry.regex === 'true' ? true : entry.regex === 'false' ? false : REGEX_BY_DEFAULT;

        if (pattern) {
            if (useRegex ? (new RegExp(pattern, flags)).test(url) : url.indexOf(pattern) >= 0) {
                result = true;
            }
        }
    }

    list = blacklist;
    len = list.length
    for (i = 0; i < len; i = i + 1) {
        entry    = list[i];
        pattern  = entry.url;
        flags    = entry.flags && typeof entry.flags === 'string' ? entry.flags : undefined;
        useRegex = typeof entry.regex === 'boolean' ? entry.regex : entry.regex === 'true' ? true : entry.regex === 'false' ? false : REGEX_BY_DEFAULT;

        if (pattern) {
            if (useRegex ? (new RegExp(pattern, flags)).test(url) : url.indexOf(pattern) >= 0) {
                log.warn(new Date().toISOString(), 'A blacklisted URL was hit:', url);
                result = false;
            }
        }
    }

    return result;
}

function isTrivialError(error) {

    // This function is designed to return true if an error from the proxy
    // is something we don't really care about, such as a 404 Not Found
    // and is thus not worth logging. Please add to this carefully.

    var result;

    if (error && typeof error === 'object') {

    }

    return result;
}

module.exports = {
    // external API...
    sanitizePort   : sanitizePort,
    getLoadScript  : getLoadScript,
    isEligible     : isEligible,
    log            : log,
    isTrivialError : isTrivialError,
    isAbsoluteUrl  : isAbsoluteUrl
};
