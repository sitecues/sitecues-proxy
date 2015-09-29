//
// This module contains helper utilities for internal use by the sitecues proxy.
//

'use strict';

var whitelist     = require('../../config/whitelist'),
    blacklist     = require('../../config/blacklist'),
    isAbsoluteUrl = require('is-absolute-url'),
    DEFAULT_PORT  = require('../defaults').ports.forward,
    log           = require('./log'),
    verbose       = process.env.VERBOSE,
    REGEX_BY_DEFAULT = true;

function meansYes(input) {

    // Boolean deserialization.

    var choices = [
            true,
            'true',
            'yes',
            'on'
        ],
        result = false;


    if (input) {
        if (typeof input.toLowerCase === 'function') {
            input = input.toLowerCase();
        }
        result = choices.indexOf(input) >= 0;
    }

    return result;
}

function meansNo(input) {

    // Boolean deserialization.

    var choices = [
        false,
        'false',
        'no',
        'off'
    ];

    if (input && typeof input.toLowerCase === 'function') {
        input = input.toLowerCase();
    }

    return choices.indexOf(input) >= 0 || false;
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

    // Use integer, if possible, otherwise leave alone for logging purposes.
    data = dataInt >= 0 ? dataInt : data;
    // NaN is fine here because of how we use > and < later.
    min  = parseInt(min, 10);
    max  = parseInt(max, 10);

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
    // must be truthy AND be between min and max.
    if (data === min || data === max || data && min < data && data < max) {
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
                'Port ' + data + ' is not in the desired range of ' +
                min + '-' + max +
                '. Attempting to use ' + result + ' instead.'
            );
        }
    }

    return result;
}

function isEligible(req) {

    var result   = true,
        useRegex = REGEX_BY_DEFAULT,
        url      = req.fullUrl(),
        list, i, len, entry,
        pattern, flags;

    list = whitelist;
    len = list.length;
    for (i = 0; i < len; i = i + 1) {
        entry    = list[i];
        pattern  = entry.url;

        if (entry.flags && typeof entry.flags === 'string') {
            flags = entry.flags;
        }
        else {
            flags = undefined;
        }

        if (meansYes(entry.regex)) {
            useRegex = true;
        }
        else if (meansNo(entry.regex)) {
            useRegex = false;
        }
        else {
            useRegex = REGEX_BY_DEFAULT;
        }

        if (pattern) {
            if (useRegex ? (new RegExp(pattern, flags)).test(url) :
                url.indexOf(pattern) >= 0) {

                result = true;
            }
        }
    }

    list = blacklist;
    len = list.length;
    for (i = 0; i < len; i = i + 1) {
        entry    = list[i];
        pattern  = entry.url;

        if (entry.flags && typeof entry.flags === 'string') {
            flags = entry.flags;
        }
        else {
            flags = undefined;
        }

        if (meansYes(entry.regex)) {
            useRegex = true;
        }
        else if (meansNo(entry.regex)) {
            useRegex = false;
        }
        else {
            useRegex = REGEX_BY_DEFAULT;
        }

        if (pattern) {
            if (useRegex ? (new RegExp(pattern, flags)).test(url) :
                url.indexOf(pattern) >= 0) {

                log.warn(
                    new Date().toISOString(),
                    'A blacklisted URL was hit:',
                    url
                );
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
        // Page Not Found errors are not worth logging.
        // TODO: Double check that this code is working as expected.
        //       For example: That the error object has this
        //       property value under that HTTP condition.
        result = error.code === 404;
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
