//
// This module contains helper utilities for internal use by the sitecues proxy.
//

'use strict';

const whitelist = require('../../config/whitelist');
const blacklist = require('../../config/blacklist');
const defaultPort = require('../defaults').port.forward;
const log     = require('../log');

const regexByDefault = true;

// Boolean deserialization.
const meansYes = (input) => {
    const choices = [
        true,
        'true',
        'yes',
        'on'
    ];

    let result = false;

    if (input) {
        if (typeof input.toLowerCase === 'function') {
            input = input.toLowerCase();
        }
        result = choices.indexOf(input) >= 0;
    }

    return result;
};

// Boolean deserialization.
const meansNo = (input) => {
    const choices = [
        false,
        'false',
        'no',
        'off'
    ];

    if (input && typeof input.toLowerCase === 'function') {
        input = input.toLowerCase();
    }

    return choices.indexOf(input) >= 0 || false;
};

// This function is designed to be a re-usable API to get
// a sensible port number, based on user input.
const sanitizePort = (data, min, max, fallback) => {
    const fallbackType = typeof fallback;
    const validFallbackTypes = [
        'string',
        'number',
        'function'
    ];
    const dataInt = parseInt(data, 10);

    let result;

    // Use integer, if possible, otherwise leave alone for logging purposes.
    data = dataInt >= 0 ? dataInt : data;
    // NaN is fine here because of how we use > and < later.
    min = parseInt(min, 10);
    max = parseInt(max, 10);

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
        if (dataInt >= 0 || process.env.VERBOSE) {
            log.warn(
                'Port ' + data + ' is not in the desired range of ' +
                min + '-' + max +
                '. Attempting to use ' + result + ' instead.'
            );
        }
    }

    return result;
};

const isEligible = (req) => {
    const url = req.fullUrl();

    let result = true;
    let useRegex = regexByDefault;
    let list;
    let len;

    list = whitelist;
    len = list.length;
    for (let i = 0; i < len; i += 1) {
        const entry = list[i];
        const pattern = entry.url;
        let flags;

        if (entry.flags && typeof entry.flags === 'string') {
            flags = entry.flags;
        }

        if (meansYes(entry.regex)) {
            useRegex = true;
        }
        else if (meansNo(entry.regex)) {
            useRegex = false;
        }
        else {
            useRegex = regexByDefault;
        }

        if (pattern) {
            if (useRegex ? (new RegExp(pattern, flags)).test(url) : url.includes(pattern)) {
                result = true;
            }
        }
    }

    list = blacklist;
    len = list.length;
    for (let i = 0; i < len; i += 1) {
        const entry = list[i];
        const pattern = entry.url;
        let flags;

        if (entry.flags && typeof entry.flags === 'string') {
            flags = entry.flags;
        }

        if (meansYes(entry.regex)) {
            useRegex = true;
        }
        else if (meansNo(entry.regex)) {
            useRegex = false;
        }
        else {
            useRegex = regexByDefault;
        }

        if (pattern) {
            if (useRegex ? (new RegExp(pattern, flags)).test(url) : url.includes(pattern)) {
                log.warn(new Date().toISOString(), 'A blacklisted URL was hit:', url);

                result = false;
            }
        }
    }

    return result;
};

// This function is designed to return true if an error from the proxy
// is something we don't really care about, such as a 404 Not Found
// and is thus not worth logging. Please add to this carefully.
const isTrivialError = (error) => {
    let result;

    if (error && typeof error === 'object') {
        // Page Not Found errors are not worth logging.
        // TODO: Double check that this code is working as expected.
        //       For example: That the error object has this
        //       property value under that HTTP condition.
        result = error.code === 404;
    }

    return result;
};

// Public API.
module.exports = {
    sanitizePort,
    isEligible,
    isTrivialError
};
