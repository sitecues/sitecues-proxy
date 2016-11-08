// A utility for creating loaders, abstract representations of an HTML script
// block which, when executed on the client, will trigger the loading process
// that initializes sitecues.

'use strict';

const sitecuesUrl = require('./sitecues-url'),
      dangit      = require('dangit');

// TODO: Make a parser for loaders.

function format(options) {

    // Settings for the loader delegate to the input, so that we don't
    // accidentally overwrite values on an object that belongs to the
    // outside world.
    // Defensive: Object.create throws an error when given undefined (etc.) so
    // we only use it if given reasonable data to delegate to.
    options = dangit.isExtendableType(options) ?
                  Object.create(options)       :
                  {};

    options.config = dangit.isExtendableType(options.config) ?
                         Object.create(options.config)       :
                         {};

    const config = options.config,
          // It is a requirement that the config object ends up with a siteId, as the
          // client library expects it. So if one is not provided, we need to get it
          // from the scriptUrl.
          needUrlSiteId = !config.siteId || typeof config.siteId !== 'string';

    let urlSiteId;

    // If the user needs us to format the script URL for them based on an object,
    // then we will.
    if (dangit.isExtendableType(config.scriptUrl)) {

        config.scriptUrl = Object.create(config.scriptUrl);

        if (needUrlSiteId) {
            urlSiteId = config.scriptUrl.siteId;
        }

        // To consistently follow the pattern of real customer implementations,
        // we have the client compute the Site ID segment of the URL, rather
        // than embedding it directly. This is unique to loaders, as opposed
        // to other systems that need to work with our URLs.
        config.scriptUrl.siteId = '\'+sitecues.config.siteId+\'';

        // Normalize and then stringify the URL settings.
        config.scriptUrl = sitecuesUrl.format(config.scriptUrl);
    }
    else if (typeof config.scriptUrl === 'string') {
        if (needUrlSiteId) {
            urlSiteId = sitecuesUrl.parse(config.scriptUrl).siteId;
        }
    }
    else {
        throw new Error(
                'Unable to determine a URL to use in the sitecues loader.'
            );
    }

    if (needUrlSiteId) {
        if (urlSiteId && typeof urlSiteId === 'string') {
            config.siteId = urlSiteId;
        }
        else {
            throw new Error(
                    'Unable to determine a Site ID to use in the sitecues loader.'
                );
        }
    }

    if (!options.provider) {
        throw new Error(
                'Unable to determine a provider to use in the sitecues loader.'
            );
    }

    let loader =
              '\n<script data-provider=\"' + options.provider + '\" type=\"application/javascript\">\n' +
              '    // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n'  +
              '    var sitecues = window.sitecues = window.sitecues || {};\n'        +
              '    sitecues.config = sitecues.config || {};\n';

    // Store an array of config keys so that we can sort them.
    const keys = [];
    for (let key in config) {
        // NOTE: We specifically *do* want inherited properties here!
        keys.push(key);
    }
    // Guarantee that the siteId is assigned to sitecues.config first, in case
    // the scriptUrl wants to use the siteId to compute itself, for example.
    keys.sort((one, two) => {
        if (one === 'siteId') {
            return -1;
        }
        else if (two === 'siteId') {
            return 1;
        }
    });

    // Fill in all settings for the client library itself.
    keys.forEach(function (key) {
        loader += '    sitecues.config.' + key + ' = '
        if (typeof config[key] === 'string') {
            loader += '\'' + config[key] + '\'';
        }
        else {
            loader += config[key];
        }

        loader += ';\n';
    });

    loader += '    (function () {\n'                                                 +
              '        var script = document.createElement(\'script\'),\n'           +
              '            first  = document.getElementsByTagName(\'script\')[0];\n' +
              '        script.type  = \'application/javascript\';\n'                 +
              '        script.async = true;\n'                                       +
              '        script.src   = sitecues.config.scriptUrl;\n'                  +
              '        first.parentNode.insertBefore(script, first);\n'              +
              '    })();\n'                                                          +
              '</script>\n';

    return loader;
}

function sitecuesLoader() {

    let api;

    if (typeof input === 'string') {
        // api = parse;
        throw new Error('Parsing loaders is not yet implemented.');
    }
    else {
        api = format;
    }

    return api.apply(undefined, arguments);
}
// sitecuesLoader.sanitize = sanitize;
sitecuesLoader.format   = format;
// sitecuesLoader.parse    = parse;

// Public module API.
module.exports = sitecuesLoader;
