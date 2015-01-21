//
// This module contains utilities for use by the sitecues proxy.
//

// NOTE: At the moment, many of these are experiments. They are not all used, especially in production.

// TODO: Clean up this module.

var whitelist         = require('./whitelist'),
    blacklist         = require('./blacklist'),
    defaultConfig,
    validConfigTypes,
    requiredConfig,
    secureProtocolMap,
    protocolPortMap,
    log = {},
    defaultPort   = 8000,  // port for the proxy if none is provided
    verbose = process.env.VERBOSE;

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

function doLog(strategy) {
    console[strategy]
}

defaultConfig = {
    provider     : 'sitecues-proxy',       // identifier on the load script for which system created it
    secure       : undefined,              // whether to ensure that the protocol used is a secure version
    protocol     : undefined,              // desired protocol family (can be overriden by secure : true)
    auth         : undefined,              // username:password, not needed by default
    hostname     : 'js.dev.sitecues.com',
    port         : 80,
    host         : 'js.dev.sitecues.com',
    route        : 'l',
    siteIdPrefix : 's;id=',
    siteId       : 's-00000005',           // Site ID designated for internal testing with IVONA speech
    directory    : 'v',                    // base path to find the
    branch       : 'dev',
    version      : 'latest',
    file         : 'sitecues.js',
    pathname     : '',
    path         : '',
    search       : '',
    query        : '',
    hash         : '',
    scriptUrl    : ''
};

validConfigTypes = {
    secure       : ['string', 'boolean'],  // must be exactly 'true', true, 'false', or false
    protocol     : ['string'],             // 'http' or 'https', the trailing : colon is optional
    auth         : ['string', 'object'],    // 'username:password' or {username:'', password:''}
    hostname     : ['string'],             // host without port number
    port         : ['string', 'number'],   // port number, relative to hostname
    host         : ['string'],             // combination of hostname:port
    route        : ['string'],             // request type, such as 'l' for library
    siteIdPrefix : ['string'],             // matrix parameter prefix for all site ids, like s;id=
    siteId       : ['string'],             // site identifier of the form 's-xxxxxxxx', where x is a lowercase hex number
    directory    : ['string'],             // where the product being requested lives, relative to the site id
    branch       : ['string'],             // version control branch name of the product, such as 'dev'
    version      : ['string'],             // build name, such as '2.1.1-RELEASE' or 'latest'
    file         : ['string'],             // main file name of the product, such as 'sitecues.js'
    pathname     : ['string'],             //
    path         : ['string'],
    search       : ['string'],             // ? question mark, plus query
    query        : ['string', 'object'],   // query data, without question mark
    hash         : ['string'],              // the #fragment id, including pound sign
    scriptUrl    : ['string']              // the complete URL for loading sitecues, as computed
};

requiredConfig = [
    'host',
    'siteId'
];

secureProtocolMap = {
    // define the secure cousin of each protocol, so that the system can decide
    // what to use, based on conditions, rather than always what is requested
    http: 'https',
    ftp:  'ftps'
};

protocolPortMap = {
    // define the default ports for various protocols, so that the system
    // can use other default behavior if a configuration matches these
    http  : 80,
    https : 443
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
                fallback = defaultPort;
            }
        }
    }
    else {
        fallback = defaultPort;
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
                             '\'//js.sitecues.com/l/s;id=\'+sitecues.config.site_id+'     +
                             '\'/js/sitecues.js\';\n'                                     +
        '                script.type = \'text/javascript\';\n'                            +
        '                script.async = true;\n'                                          +
        '                script.src=sitecues.config.script_url;\n'                        +
        '                first.parentNode.insertBefore(script, first);\n'                 +
        '            })();\n'                                                             +
        '        </script>\n    ';
    return result;
}

// function getBetterLoadScript(config) {

//     var result;
//     if (Object.keys(config).indexOf('provider') >= 0) {

//     }

//     result = '' +
//         '\n        <script data-provider=\"' + config.provider + '\" type=\"text/javascript\">\n'  +
//         '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n'              +
//         '            var sitecues = window.sitecues || {};\n\n'                                    +
//         '            sitecues.config = {\n'                                                        +
//         '                site_id : \'' + config.siteId + '\'\n'                                    +
//         '            };\n\n'                                                                       +
//         '            (function () {\n'                                                             +
//         '                var script = document.createElement(\'script\'),\n'                       +
//         '                first = document.getElementsByTagName(\'script\')[0];\n'                  +
//         '                sitecues.config.script_url=document.location.protocol+'                   +
//                              '\'//js.dev.sitecues.com/l/s;id=\'+sitecues.config.site_id+'          +
//                              '\'/v/dev/latest/js/sitecues.js\';\n'                                 +
//         '                script.type = \'text/javascript\';\n'                                     +
//         '                script.async = true;\n'                                                   +
//         '                script.src=sitecues.config.script_url;\n'                                 +
//         '                first.parentNode.insertBefore(script, first);\n'                          +
//         '            })();\n'                                                                      +
//         '        </script>\n    ';


// }

function sanitizeConfig(config) {

    var i, keys, len, setting, configType = typeof config;

    if (config && configType === 'object') {
        keys = Object.keys(defaultConfig);
        len  = keys.length;
        // loop through defaults, to apply only as necessary...
        for (i = 0; i < len; i = i + 1) {
            setting = keys[i];  // current property
            if (!config[setting]) {
                config[setting] = defaultConfig[setting];
            }
        }
    }
}

// this list represents formats for the proxy to understand how to process in various ways
// it is the basis for more semantic whitelists and blacklists, etc.
fileFormats = {
    documents : [
        'js',
        'css',
        'svg',
        'xml',
        'rss'
    ],
    images : [
        'png',
        'jpg',
        'jpeg',
        'bmp'
    ],
    misc : [
        // default group for adding, when none is specified
    ]
};

function getFileFormats(filter) {

    var filterType = typeof filter,
        list       = fileFormats,
        keys       = Object.keys(list),
        len        = keys.length,
        group,
        i,
        x,
        max,
        result = list,
        error = false,
        errorMessage = 'Unable to retrieve file format list';

    if (filterType === 'string') {
        if (filter) {
            result = result[filter];
        }
        else {
            error = true;
            errorMessage = errorMessage + ', the filter is an empty string.';
        }
    }
    else if (filterType === 'function') {
        result = [];
        // loop through file format groups...
        for (i = 0; i < len; i = i + 1) {
            group = keys[i];
            result.push(filter(group, list[group], result));
        }
    }
    // if not specified...
    else if (filterType === 'undefined') {
        result = [];
        // loop through file format groups...
        for (i = 0; i < len; i = i + 1) {
            group = keys[i];
            // loop through known file formats...
            for (x = 0, max = list[group].length; x < max; x = x + 1) {
                // check that the group does not already contain the file format...
                if (result.indexOf(list[group][x]) === -1) {
                    result.push(list[group][x]);
                }
            }
        }
    }
    // if array...
    else if (filter && filterType === 'object' && typeof filter.length === 'number' && (filter.length || filter.length === 0)) {
        result = [];
        // loop through file format groups...
        for (i = 0, len = filter.length; i < len; i = i + 1) {
            group = filter[i];
            // loop through known file formats...
            for (x = 0, max = list[group].length; x < max; x = x + 1) {
                result.push(list[group][x]);
            }
        }
    }
    else if (filter && filterType === 'boolean') {
        result = list;
    }
    else {
        error = true;
        errorMessage = errorMessage + ', the filter is ';
        if (filter === null) {
            errorMessage = errorMessage + 'null';
        }
        else {
            errorMessage = errorMessage + 'of type \"' + filterType + '\"';
        }
        errorMessage = errorMessage + '.';
    }

    if (error) {
        throw new Error(errorMessage);
    }

    return result;
}

function addFileFormat(format, filter) {
    var formatType      = typeof format,
        filterType      = typeof filter,
        list            = fileFormats,
        keys            = Object.keys(list),
        len             = keys.length,
        group,
        i,
        defaultGroup    = 'misc',
        result          = list,
        error           = false,
        errorMessage    = 'Unable to add file format to list';

    if (formatType !== 'string') {
        error = true;
        errorMessage = errorMessage + ', the format is not a string.';
    }
    else if (!format) {
        error = true;
        errorMessage = errorMessage + ', the format is an empty string.';
    }
    else {
        if (!filter) {
            result[defaultGroup].push(format);
        }

        // At this point onward, we know there is a truthy filter and a usable file format...

        else if (filterType === 'string') {
            // check for situations where the group does not exist...
            if (!Object.prototype.hasOwnProperty.call(result, filter)) {
                // create the group, with the file format filled in...
                result[filter] = [format];
            }
            else {
                // check that the group is an array...
                if (result[filter] && typeof result[filter] === 'object' && typeof result[filter].length === 'number' && (result[filter].length || result[filter].length === 0)) {
                    // check that the group does not already contain the file format...
                    if (result[filter].indexOf(format) === -1) {
                        result[filter].push(format);
                    }
                }
                else {
                    error = true;
                    errorMessage = errorMessage + ', group \"' + filter + '\" does exist, but is not an array.';
                }
            }
            // for a convenient API, make the result point to the group...
            result = result[filter];
        }
        else if (filterType === 'function') {
            // loop through file format groups...
            for (i = 0; i < len; i = i + 1) {
                group = keys[i];
                filter(group, list[group], format);
            }
        }
        else {
            error = true;
            errorMessage = errorMessage + ', the filter is of type \"' + filterType + '\".';
        }
    }

    if (error) {
        throw new Error(errorMessage);
    }

    return result;
}

function isEligible(req) {

    var result   = false,
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

function removeLoadScripts(origin) {

    var originType = typeof origin,
        matches,
        selector = 'script[data-provider="sitecues"]';

    if (originType === 'function') {
        matches = origin(selector);
    }
    else if (origin && typeof origin.$ === 'function') {
        matches = origin.$(selector);
    }
    else {
        throw new Error('Unable to remove load script from given input.');
    }

    matches.remove();
}

function putSitecues(req, resp, loadScript) {
    // Remove any existing sitecues load scripts, to avoid conflicts...
    resp.$('script[data-provider="sitecues"]').remove();
    // Inject our desired sitecues load script...
    resp.$('head').eq(0).append(loadScript);
}

module.exports = {
    // external API...
    sanitizePort   : sanitizePort,
    getLoadScript  : getLoadScript,
    isTrue         : isTrue,
    getFileFormats : getFileFormats,
    isEligible     : isEligible,
    log            : log
};
