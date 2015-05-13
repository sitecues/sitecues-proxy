//
// This module contains helper utilities for internal use by the sitecues proxy.
//

var whitelist     = require('../../config/whitelist'),
    blacklist     = require('../../config/blacklist'),
    isAbsoluteUrl = require('is-absolute-url'),
    DEFAULT_PORT  = require('../default-ports').forward,  // port for the proxy if none is provided
    log           = require('./log'),
    verbose       = process.env.VERBOSE;

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
            log.warn(
                'Port ' + data + ' is not in the desired range of ' + min + '-' + max +
                '. Attempting to use ' + result + ' instead.'
            );
        }
    }

    return result;
}

function getBranchLib (branch) {
    return '/v/' + branch + '/latest/js/sitecues.js';
}

function getDevLib (devVersion) {
    return '/v/dev/' + devVersion + '-DEV/js/sitecues.js';
}

function getReleaseLib (release) {

    var releaseArray = release.split('.'),
        major        = releaseArray[0],
        minor        = releaseArray[1];

    return '/v/release-' + major + '.' + minor + '/' + release + '-RELEASE/js/sitecues.js';

}

function getLoadScript(options) {

    var siteId     = options.siteId,
        branch     = options.branch,
        devVersion = options.devVersion,
        release    = options.release,
        ipAddress  = options.ipAddress,
        production = options.production,
        // Default library. Overwritten if options arg has branch, devVersion, or release set
        library    = '/v/dev/latest/js/sitecues.js',
        // Default host. Overwritten if options arg has ipAddress or production set
        host       = 'js.dev.sitecues.com',
        result,
        scriptUrl;

    // User supplied a specific branch.
    if (branch) {
        library = getBranchLib(branch);
    }

    // User supplied a specific dev version.
    if (devVersion) {
        library = getDevLib(devVersion);
    }

    // User supplied a specific release.
    if (release) {
        library = getReleaseLib(release);
    }

    if (production) {
        host    = 'js.sitecues.com';
        library = '/js/sitecues.js';
    }

    // User supplied a specific ip address to serve sitecues from.  i.e. localhost
    if (ipAddress) {
        scriptUrl = '\'//' + ipAddress + '/js/sitecues.js\';\n';
    } else {
        scriptUrl = '\'//' + host + '/l/s;id=\'+sitecues.config.site_id+\'' + library + '\';\n';
    }

    log.verbose('Injecting sitecues script: ' + scriptUrl);

    result =
    '\n        <script data-provider=\"sitecues-proxy\" type=\"application/javascript\">\n' +
    '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n'           +
    '            var sitecues = window.sitecues = window.sitecues || {};\n'                 +
    '            sitecues.config = sitecues.config || {};\n'                                +
    '            sitecues.config.siteId = \'' + siteId + '\';\n'                            +
    '            sitecues.config.scriptUrl=\'https:\'+' + scriptUrl                         +
    '            (function () {\n'                                                          +
    '                var script = document.createElement(\'script\'),\n'                    +
    '                    first  = document.getElementsByTagName(\'script\')[0];\n'          +
    '                script.type  = \'application/javascript\';\n'                          +
    '                script.async = true;\n'                                                +
    '                script.src   = sitecues.config.scriptUrl;\n'                           +
    '                first.parentNode.insertBefore(script, first);\n'                       +
    '            })();\n'                                                                   +
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

function isRootRelative(url) {

    // Detect URLs which are relative to the root directory of the website they are used on.
    // These start with a slash, but not two slashes.

    var result;

    if (typeof url === 'string') {
        result = /^\/(?!\/)/.test(url.trim());
    }

    return result;
}

module.exports = {
    // external API...
    sanitizePort   : sanitizePort,
    getLoadScript  : getLoadScript,
    isEligible     : isEligible,
    isTrivialError : isTrivialError,
    isAbsoluteUrl  : isAbsoluteUrl,
    isRootRelative : isRootRelative
};
