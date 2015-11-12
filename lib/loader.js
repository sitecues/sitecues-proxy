// This module is designed to provide a proxy-specific abstraction for dealing
// with sitecues loaders. For example, it can set defaults and make
// adjustments that are unique to this project.

'use strict';

const sitecuesLoader = require('./util/sitecues-loader'),
      dangit         = require('dangit');

// Injecting a script that loads sitecues in pages delivered to the client is
// an important responsibility for the sitecues proxy. This helper generates
// one based on configuration, with reasonable defaults.
function createLoader(options) {

    // Settings for the loader delegate to the input, so that we don't
    // accidentally overwrite values on an object that belongs to the
    // outside world.
    // Defensive: Object.create throws an error when given undefined (etc.) so
    // we only use it if given reasonable input to delegate to.
    options = dangit.isExtendableType(options) ?
                  Object.create(options)       :
                  {};

    options.config = dangit.isExtendableType(options.config) ?
                     Object.create(options.config)       :
                     {};

    const config = options.config;

    // The load script provider attribute is used by sitecues and other tooling
    // to identify our own code in a way that is available to CSS selectors.
    if (!options.provider || typeof options.provider !== 'string') {
        options.provider = 'sitecues-proxy';
    }

    // The config object is our public API for initial library settings.
    if (!config.siteId || typeof config.siteId !== 'string') {
        config.siteId = 's-98595d91';
    }

    return sitecuesLoader.format(options);
}

// Public module API.
module.exports = {
    createLoader
};
