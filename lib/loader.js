// This module is designed to provide a proxy-specific abstraction for dealing
// with sitecues loaders. For example, it can set defaults and make
// adjustments that are unique to this project.

'use strict';

const sitecuesLoader = require('./util/sitecues-loader');

// The proxy's main purpose in life is to inject script tags into webpages
// it delivers, such that when visited by a user, the sitecue client-side
// app will load. Here we generate those script tags.
const createLoader = (option) => {
    const sanitized = Object.assign(
        {
            // The load script provider attribute is used by Sitecues and other tooling
            // to identify our own code in a way that is available to CSS selectors.
            provider : 'sitecues-proxy'
        },
        option
    );

    // The config object is our public API for initial library settings.
    sanitized.config = Object.assign(
        {
            siteId : 's-98595d91'
        },
        sanitized.config
    );

    // Take the options that we have sanitized and use them to get a stringified
    // representation of the script tag that can be embedded within a website to
    // implement the sitecues client-side app.
    return sitecuesLoader.format(sanitized);
};

// Public module API.
module.exports = {
    createLoader
};
