'use strict';

const url = require('url');
const path = require('path');

const jsEnv = {
    // Environment to hostname alias mapping.
    prod  : 'js.sitecues.com',
    dev   : 'js.dev.sitecues.com',
    local : 'localhost'
};
/* eslint-disable no-multi-spaces */
jsEnv.auto        = jsEnv.prod;
jsEnv.production  = jsEnv.prod;
jsEnv.development = jsEnv.dev;
jsEnv.devel       = jsEnv.dev;
jsEnv.localhost   = jsEnv.local;
/* eslint-enable no-multi-spaces */

// Find the first argument that can be mapped to a known environment and return
// and return that environment name, if found.
const getEnvironment = (input) => {
    if (!input) {
        return;
    }
    const needle = input.toLowerCase();

    const envs = Object.keys(jsEnv);

    if (envs.includes(needle)) {
        return needle;
    }

    return envs.find((name) => {
        return needle === jsEnv[name];
    });
};

// This function is designed to resolve an environment name
// to a hostname. It should *not* assume a default.
const getHostname = (input) => {
    if (!input) {
        return;
    }
    const needle = input.toLowerCase();

    const envs = Object.keys(jsEnv);

    if (envs.includes(needle)) {
        return jsEnv[needle];
    }

    // It might be a hostname we know, instead of an environment.
    // Let's check that to be sure.
    for (const name in jsEnv) {
        if (Object.prototype.hasOwnProperty.call(jsEnv, name)) {
            if (needle === jsEnv[name]) {
                return jsEnv[name];
            }
        }
    }
};

const parseHost = (host) => {
    if (typeof host === 'string') {
        const parts = host.split(':');
        return {
            name : parts[0],
            port : parts[1]
        };
    }
};

const scrubHostname = (input) => {
    return jsEnv[input] || input;
};

// This function is designed to process a Node url.format() compatible
// object and give it good defaults, extended with a few goodies like
// 'environment', which are specific to sitecues and our URL patterns.

// To be user friendly, we allow the environment to be set by an alias
// from the host or hostname variables. But since it is not gauranteed
// that the user will actually do that, we must parse it from an
// an actual hostname when necessary.
const sanitize = (option) => {
    let environment;

    const result = Object.create(option || Object.prototype);

    // Allow the user to explicitly set and override any
    // later heuristics for determining the environment.
    if (option.environment) {
        environment = option.environment;
    }
    if (option.host) {
        const host = parseHost(option.host);
        if (host) {
            if (!environment) {
                environment = getEnvironment(host.name);
            }
            const hostname = scrubHostname(host.name);
            result.host = host.port ? hostname + ':' + host.port : hostname;
        }
    }
    else if (option.hostname) {
        if (!environment) {
            environment = getEnvironment(option.hostname);
        }
        result.hostname = scrubHostname(option.hostname);
    }
    else {
        result.hostname = getHostname('prod');
    }
    if (!environment) {
        environment = 'prod';
    }
    result.environment = environment;

    if (!option.route) {
        result.route        = 'l';
    }
    if (!option.siteIdPrefix) {
        result.siteIdPrefix = 's;id=';
    }
    if (!option.siteId) {
        result.siteId       = 's-00000005';
    }
    if (!option.branch) {
        result.branch       = 'dev';
    }
    if (!option.version) {
        result.version      = 'latest';
    }
    if (!option.directory) {
        result.directory    = 'js';
    }
    if (!option.file) {
        result.file         = 'sitecues.js';
    }
    if (!option.pathname) {
        // Pathname common to all known environments.
        result.pathname = path.posix.join(
            result.route,
            result.siteIdPrefix + result.siteId
        );
        // Environment specific components, extending the common one.
        if (environment === 'dev') {
            result.pathname = path.posix.join(
                result.pathname,
                result.branch,
                result.version
            );
        }
        // Final path components common to all known environments.
        result.pathname = path.posix.join(
            result.pathname,
            result.directory,
            result.file
        );
    }

    return result;
};

const format = (option) => {
    return url.format(sanitize(option));
};

// This function is designed to be Node url.parse() compatible.
// It adds a few properies to the returned object that are
// specific to sitecues, such as Site IDs.
// TODO: Need to parse build versions, etc. for equilibrium with format()
const parse = () => {
    const parsed = url.parse(...arguments);
    let environment;

    if (parsed.hostname) {
        environment = getEnvironment(parsed.hostname);
        if (environment) {
            parsed.environment = environment;
        }
    }

    if (parsed.pathname) {
        const siteIdPattern = /s-[\da-zA-Z]{8}/;
        // Find the unique string used to identify a customer.
        const siteId = parsed.pathname.match(siteIdPattern);
        if (siteId) {
            parsed.siteId = siteId[0];
        }
        const file = parsed.pathname.substring(parsed.pathname.lastIndexOf('/') + 1);
        if (file) {
            parsed.file = file;
        }

        // Figure out the git branch this URL uses. Not all environments
        // are branch-aware, however.
        if (environment !== 'local') {
            // MAGIC NUMBER: 11 is the length of a Site ID + '/' in a URL.
            const branchStart = parsed.pathname.search(siteIdPattern) + 11;
            const branch = parsed.pathname.substring(
                branchStart,
                parsed.pathname.indexOf(
                    '/',
                    branchStart
                )
            );

            if (branch) {
                parsed.branch = branch;
            }
        }
    }

    return parsed;
};

module.exports = {
    sanitize,
    format,
    parse
};
