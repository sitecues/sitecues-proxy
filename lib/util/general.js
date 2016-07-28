//
// This module contains helper utilities for internal use by the sitecues proxy.
//

'use strict';

const whitelist = require('../../config/whitelist');
const blacklist = require('../../config/blacklist');

// Boolean deserialization.
const meansYes = (input) => {
    const choices = [
        true,
        'true',
        'yes',
        'on'
    ];

    const needle = (input && typeof input.toLowerCase === 'function') ?
        input.toLowerCase() :
        input;

    return choices.includes(needle);
};

// Boolean deserialization.
const meansNo = (input) => {
    const choices = [
        false,
        'false',
        'no',
        'off'
    ];

    const needle = (input && typeof input.toLowerCase === 'function') ?
        input.toLowerCase() :
        input;

    return choices.includes(needle);
};

const isEligible2 = (req) => {
    const url = req.fullUrl();
    const regexByDefault = true;

    const entryMatches = (entry) => {
        const pattern = entry.url;

        if (!pattern) {
            return false;
        }

        let flags;

        if (entry.flags && typeof entry.flags === 'string') {
            flags = entry.flags;
        }

        const useRegex = meansYes(entry.regex) || (!meansNo(entry.regex) && regexByDefault);

        return useRegex ? (new RegExp(pattern, flags)).test(url) : url.includes(pattern);
    };

    const isWhitelisted = whitelist.some(entryMatches);
    const isBlacklisted = blacklist.some(entryMatches);

    const eligibleByDefault = true;

    return !isBlacklisted && (eligibleByDefault || isWhitelisted);
};

// This function is designed to return true if an error from the proxy is
// something we don't really care about, such as a 404 Not Found and is
// thus not worth logging. Please use care when adding to this.
const isTrivialError = (error) => {
    if (error && typeof error === 'object') {
        // Page Not Found errors are not worth logging.
        // TODO: Double check that this code is working as expected.
        //       For example: That the error object has this
        //       property value under that HTTP condition.
        return error.code === 404;
    }
};

// Public API.
module.exports = {
    isEligible2,
    isTrivialError
};
