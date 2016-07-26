//
// This module contains helper utilities for internal use by the sitecues proxy.
//

'use strict';

const whitelist = require('../../config/whitelist');
const blacklist = require('../../config/blacklist');
const log = require('../log');

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
    isEligible,
    isTrivialError
};
