// This module is designed to provide a proxy-specific abstraction for dealing
// with sitecues loaders. For example, it can set defaults and make
// adjustments that are unique to this project.

'use strict';

const dangit = require('dangit');
const sitecuesLoader = require('./util/sitecues-loader');

// One big responsibility that the sitecues proxy has is to inject script tags
// into webpages it delivers, such that when visited by a user, the sitecues
// client-side app will load. This helper generates those script tags,
// based on configuration, with reasonable defaults.
const createLoader = (input) => {
    // Settings for the loader delegate to the input, so that we don't
    // accidentally overwrite values on an object that belongs to the
    // outside world.
    // Defensive: Object.create throws an error when given undefined (etc.) so
    // we only use it if given reasonable input to delegate to.
    const data = dangit.isExtendableType(input) ?
        Object.create(input) :
        {};

    data.config = dangit.isExtendableType(data.config) ?
        Object.create(data.config) :
        {};

    const config = data.config;

    // The load script provider attribute is used by sitecues and other tooling
    // to identify our own code in a way that is available to CSS selectors.
    if (!data.provider || typeof data.provider !== 'string') {
        data.provider = 'sitecues-proxy';
    }

    // The config object is our public API for initial library settings.
    if (!config.siteId || typeof config.siteId !== 'string') {
        config.siteId = 's-98595d91';
    }

    // Take the options that we have sanitized and use them to get a stringified
    // representation of the script tag that can be embedded within a website to
    // implement the sitecues client-side app.
    const createdSitecuesLoader = sitecuesLoader.format(data);

    // Give back the script tag string.
    return createdSitecuesLoader;
};

// Public module API.
module.exports = {
    createLoader
};
