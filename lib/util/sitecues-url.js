'use strict';

const dangit     = require('dangit'),
      join       = dangit.join,
      joinTruthy = dangit.joinTruthy,
      url        = require('url'),
      SITE_ID_PATTERN = /s-[\da-zA-Z]{8}/,
      HOSTNAME   = {
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

    const len = arguments.length;

    let input, env, i;

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

    const len = arguments.length;

    let input, env, i;

    for (i = 0; i < len; i += 1) {
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

// The following helper function may be useful someday,
// but isn't needed at the moment.

// function findPort() {

//     // This function is designed to take hosts such as 'foo.com:3000'
//     // and return the first feasible port number, such as '3000'.

//     let i, host, attempt, separatorIndex,
//         len = arguments.length;

//     for (i = 0; i < len; i = i + 1) {
//         host = arguments[i];
//         if (host) {
//             if (typeof host !== 'string') {
//                 host = host.toString();
//             }
//             // To avoid returning a hostname as a port by accident,
//             // we require the ':' separator to identifiy the port.
//             // This does not remove paths, query strings, etc.)
//             separatorIndex = host.indexOf(':');
//             if (separatorIndex >= 0) {
//                 attempt = host.substring(separatorIndex + 1);
//                 if (attempt) {
//                     return attempt;
//                 }
//             }
//         }
//     }
// }

// The following helper function may be useful someday,
// but isn't needed at the moment.

// function findHostname() {

//     // This function is designed to take hosts such as 'foo.com:3000'
//     // and return the first feasible hostname, such as 'foo.com'.

//     let i, host, attempt, len = arguments.length;

//     for (i = 0; i < len; i = i + 1) {
//         host = arguments[i];
//         if (host) {
//             if (typeof host !== 'string') {
//                 host = host.toString();
//             }

//             // This algorithm is very simplistic. It is ignorant of
//             // trailing slashes and will assume the input is
//             // already a hostname if no port is provided.
//             attempt = host.substring(0, host.indexOf(':')) || host;
//             if (attempt) {
//                 return attempt;
//             }
//         }
//     }
// }

function parseHost(host) {
    if (typeof host === 'string') {
        const temp = host.split(':');
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

    let environment;

    // Defensive: Object.create does not like undefined, etc. so we
    // give it a blank slate to start with in edge cases.
    if (!dangit.isExtendableType(options)) {
        options = Object.prototype;
    }

    const result = Object.create(options);

    // Allow the user to explicitly set and override any
    // later heuristics for determining the environment.
    if (options.environment) {
        environment = options.environment;
    }
    if (options.host) {
        const host = parseHost(options.host);
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
        result.route        = 'l';
    }
    if (!options.siteIdPrefix) {
        result.siteIdPrefix = 's;id=';
    }
    if (!options.siteId) {
        result.siteId       = 's-00000005';
    }
    if (!options.branch) {
        result.branch       = 'dev';
    }
    if (!options.version) {
        result.version      = 'latest';
    }
    if (!options.directory) {
        result.directory    = 'js';
    }
    if (!options.file) {
        result.file         = 'sitecues.js';
    }
    if (!options.pathname) {
        // Pathname common to all known environments.
        result.pathname = join(
            {separator: '/'},
            result.route,
            result.siteIdPrefix + result.siteId
        );
        // Environment specific components, extending the common one.
        if (environment === 'dev') {
            result.pathname = join(
                {separator: '/'},
                result.pathname,
                result.branch,
                result.version
            );
        }
        // Final path components common to all known environments.
        result.pathname = join(
            {separator: '/'},
            result.pathname,
            result.directory,
            result.file
        );
    }

    return result;
}

function format(options) {

    return url.format(sanitize(options));
}

function parse() {

    // This function is designed to be Node url.parse() compatible.
    // It adds a few properies to the returned object that are
    // specific to sitecues, such as Site IDs.

    // TODO: Need to parse build versions, etc. for equilibrium with format()

    let environment,
        result = url.parse.apply(url, arguments);

    if (result.hostname) {
        environment = getEnvironment(result.hostname);
        if (environment) {
            result.environment = environment;
        }
    }

    if (result.pathname) {
        // Find the unique string used to identify a customer.
        const siteId = result.pathname.match(SITE_ID_PATTERN);
        if (siteId) {
            result.siteId = siteId[0];
        }
        const file = result.pathname.substring(result.pathname.lastIndexOf('/') + 1);
        if (file) {
            result.file = file;
        }

        // Figure out the git branch this URL uses. Not all environments
        // are branch-aware, however.
        if (environment !== 'local') {
            // MAGIC NUMBER: 11 is the length of a Site ID + '/' in a URL.
            const branchStart = result.pathname.search(SITE_ID_PATTERN) + 11,
                  branch = result.pathname.substring(
                      branchStart,              // begin at the branch's start index
                      result.pathname.indexOf(  // branch ends before the next slash
                          '/',
                          branchStart
                      )
                  );
            if (branch) {
                result.branch = branch;
            }
        }
    }

    return result;
}

function sitecuesUrl() {

    // This function is designed to be a convenient entry point
    // to parse or format a URL, depending on the input type.

    let api;

    if (typeof input === 'string') {
        api = parse;
    }
    else {
        api = format;
    }

    return api.apply(undefined, arguments);
}

sitecuesUrl.sanitize = sanitize;
sitecuesUrl.format   = format;
sitecuesUrl.parse    = parse;

module.exports = sitecuesUrl;
