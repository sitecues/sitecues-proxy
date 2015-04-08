var HOSTNAME = {
    // Environment to hostname alias mapping.
    prod  : 'js.sitecues.com',
    dev   : 'js.dev.sitecues.com',
    local : 'localhost'
};
HOSTNAME.auto        = HOSTNAME.prod;
HOSTNAME.production  = HOSTNAME.prod;
HOSTNAME.development = HOSTNAME.dev;
HOSTNAME.devel       = HOSTNAME.dev;
HOSTNAME.localhost   = HOSTNAME.local;

function getEnvironment() {

    // This function is designed to find the first argument
    // that can be mapped to a known environment, and then
    // it returns that environment name, if found.

    var len = arguments.length,
        i, input, env;

    for (i = 0; i < len; i = i + 1) {
        input = arguments[i];
        if (!input) {
            continue;
        }
        input = input.toString().toLowerCase();
        for (env in HOSTNAME) {
            if (Object.prototype.hasOwnProperty.call(HOSTNAME, env)) {
                if (input === HOSTNAME[env] || input === env) {
                    return env;
                }
            }
        }
    }
}

function getHostname() {

    // This function is designed to resolve an environment
    // to a hostname. It should *not* assume a default.

    var len = arguments.length,
        i, input, env;

    for (i = 0; i < len; i = i + 1) {
        input = arguments[i];
        if (!input) {
            continue;
        }
        input = input.toString().toLowerCase();
        if (HOSTNAME[input]) {
            return HOSTNAME[input];
        }
        // It might be a hostname we know, instead of an environment.
        // Let's check that to be sure.
        for (env in HOSTNAME) {
            if (Object.prototype.hasOwnProperty.call(HOSTNAME, env)) {
                if (input === HOSTNAME[env]) {
                    return HOSTNAME[env];
                }
            }
        }
    }
}

function join(options) {

    // This function is designed to make a string, with optional separators,
    // from all arguments that are truthy. Useful for paths, etc.

    var firstToken = true, separator, polarity, alwaysAllow, start = 0,
        i, len = arguments.length, result = '';

    if (options && typeof options === 'object') {
        // Make sure the options are ignored while joining the arguments.
        start     = 1;
        separator = options.separator;
        polarity  = options.polarity;
    }
    // The polarity setting acts like a filter and by default we
    // don't want to filter at all, just join everything.
    alwaysAllow = typeof polarity === 'undefined';

    if (separator) {
        if (alwaysAllow) {
            for (i = start; i < len; i = i + 1) {
                if (!firstToken) {
                    result = result + separator;
                }
                else {
                    firstToken = !firstToken;
                }
                result = result + arguments[i];
            }
        }
        else if (polarity) {
            for (i = start; i < len; i = i + 1) {
                if (arguments[i]) {
                    if (!firstToken) {
                        result = result + separator;
                    }
                    else {
                        firstToken = !firstToken;
                    }
                    result = result + arguments[i];
                }
            }
        }
        else {
            for (i = start; i < len; i = i + 1) {
                if (!arguments[i]) {
                    if (!firstToken) {
                        result = result + separator;
                    }
                    else {
                        firstToken = !firstToken;
                    }
                    result = result + arguments[i];
                }
            }
        }
    }
    else {
        if (alwaysAllow) {
            for (i = start; i < len; i = i + 1) {
                result = result + arguments[i];
            }
        }
        else if (polarity) {
            for (i = start; i < len; i = i + 1) {
                if (arguments[i]) {
                    result = result + arguments[i];
                }
            }
        }
        else {
            for (i = start; i < len; i = i + 1) {
                if (!arguments[i]) {
                    result = result + arguments[i];
                }
            }
        }
    }

    return result;
}

function joinTruthy(options) {

    var args, opts, start;

    if (options && typeof options === 'object') {
        opts = Object.create(options);
        start = 1;
    }
    else {
        opts = {};
        start = 0;
    }
    opts.polarity = true;

    // Only the non-option args.
    args = Array.prototype.slice.call(arguments, start);
    // Add the modified options.
    args.unshift(opts);

    return join.apply(undefined, args);
}

function findPort() {

    // This function is designed to take hosts such as 'foo.com:3000'
    // and return the first feasible port number, such as '3000'.

    var i, host, attempt, separatorIndex,
        len = arguments.length;

    for (i = 0; i < len; i = i + 1) {
        host = arguments[i];
        if (host) {
            if (typeof host !== 'string') {
                host = host.toString();
            }
            // To avoid returning a hostname as a port by accident,
            // we require the ':' separator to identifiy the port.
            // This does not remove paths, query strings, etc.)
            separatorIndex = host.indexOf(':');
            if (separatorIndex >= 0) {
                attempt = host.substring(separatorIndex + 1);
                if (attempt) {
                    return attempt;
                }
            }
        }
    }
}

function findHostname() {

    // This function is designed to take hosts such as 'foo.com:3000'
    // and return the first feasible hostname, such as 'foo.com'.

    var i, host, attempt, len = arguments.length;

    for (i = 0; i < len; i = i + 1) {
        host = arguments[i];
        if (host) {
            if (typeof host !== 'string') {
                host = host.toString();
            }
            // Case 1 - Parse it ourselves, in a way which cannot handle slashes
            //          and will fail if there is no port number.
            // Case 2 - There is no port, so fallback to assuming it already is a hostname.
            attempt = host.substring(0, host.indexOf(':')) || host;
            if (attempt) {
                return attempt;
            }
        }
    }
}

function parseHost(host) {

    var temp;

    if (typeof host === 'string') {
        temp = host.split(':');
        return {
            name : temp[0],
            port : temp[1]
        };
    }
}

function scrubHostname(input) {
    return HOSTNAME[input] || input;
}

function sanitize(options) {

    // This function is designed to process a Node url.format() compatible
    // object and give it good defaults, extended with a few goodies like
    // 'environment', which are specific to sitecues and our URL patterns.

    // To be user friendly, we allow the environment to be set by an alias
    // from the host or hostname variables. But since it is not gauranteed
    // that the user will actually do that, we must parse it from an
    // an actual hostname when necessary.

    var optionsType = typeof options, environment, host, temp, key, result;

    // Defensive: Object.create does not like undefined, etc. so we
    // give it a blank slate to start with in edge cases.
    if (!options || (optionsType !== 'object' && optionsType !== 'function')) {
        options = Object.prototype;
    }
    result = Object.create(options);

    // Allow the user to explicitly set and override any
    // later heuristics for determining the environment.
    if (options.environment) {
        environment = options.environment;
    }
    if (options.host) {
        host = parseHost(options.host);
        if (host) {
            if (!environment) {
                environment = getEnvironment(host.name);
            }
            result.host = joinTruthy(
                {separator: ':'},
                scrubHostname(host.name), host.port
            );
        }
    }
    else if (options.hostname) {
        if (!environment) {
            environment = getEnvironment(options.hostname);
        }
        result.hostname =  scrubHostname(options.hostname);
    }
    else {
        result.hostname = getHostname('prod');
    }
    if (!environment) {
        environment = 'prod';
    }
    result.environment = environment;

    if (!options.route) {
        result.route          = 'l';
    }
    if (!options.siteIdPrefix) {
        result.siteIdPrefix   = 's;id';
    }
    if (!options.siteId) {
        result.siteId         = 's-00000005';
    }
    if (!options.directory) {
        result.directory      = 'v';
    }
    if (!options.branch) {
        result.branch         = 'dev';
    }
    if (!options.version) {
        result.version        = 'latest';
    }
    // TODO: Figure out a better name for this one...
    if (!options.mediaDir) {
        result.mediaDir       = 'js';
    }
    if (!options.file) {
        result.file           = 'sitecues.js';
    }
    if (!options.pathname) {
        // Pathname common to all known environments.
        result.pathname = join(
            {separator: '/'},
            result.route,
            result.siteIdPrefix + '=' + result.siteId
        );
        // Environment specific components, extending the common one.
        if (environment === 'dev') {
            result.pathname = join(
                {separator: '/'},
                result.pathname,
                result.directory,
                result.branch,
                result.version
            );
        }
        // Final path components common to all known environments.
        result.pathname = join(
            {separator: '/'},
            result.pathname,
            result.mediaDir,
            result.file
        );
    }
    if (!options.provider) {
        result.provider       = 'sitecues-proxy';
    }

    return result;
}

function format(options) {

    options = sanitize(options);

    return url.format(options);
}

function parse() {

    // TODO: At the moment, this is just an alias to Node's URL parser.
    //       It would be super useful if it could parse out Site IDs,
    //       branches, build versions, etc.

    return url.parse.apply(url, arguments);
}

function sitecuesUrl(input) {

    var api, result;

    if (typeof input === 'string') {
        api = parse;
    }
    else {
        api = format;
    }

    return api.apply(this, arguments);
}

sitecuesUrl.sanitize = sanitize;
sitecuesUrl.format   = format;
sitecuesUrl.parse    = parse;

module.exports = sitecuesUrl;
