// A utility for creating loaders, abstract representations of an HTML script
// block which, when executed on the client, will trigger the loading process
// that initializes sitecues.

'use strict';

const redent = require('redent');
const dangit = require('dangit');
const sitecuesUrl = require('./sitecues-url');

// TODO: Make a parser for loaders.

// Create a loader string from some settings.
const format = (input) => {
    const option = Object.assign({}, input);

    option.config = Object.assign({}, option.config);

    const { config } = option;
    // It is a requirement that the config object ends up with a siteId, as the
    // client library expects it. So if one is not provided, we need to get it
    // from the scriptUrl.
    const needUrlSiteId = !config.siteId || typeof config.siteId !== 'string';

    let urlSiteId;

    // If the user needs us to format the script URL for them based on an object,
    // then we will.
    if (dangit.isExtendableType(config.scriptUrl)) {
        if (needUrlSiteId) {
            urlSiteId = config.scriptUrl.siteId;
        }

        config.scriptUrl = Object.assign({}, config.scriptUrl);

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

    if (!option.provider) {
        throw new Error(
            'Unable to determine a provider to use in the sitecues loader.'
        );
    }

    let loader = redent(
        `
        <script data-provider="${option.provider}" type="application/javascript">
              // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES
              var sitecues = window.sitecues = window.sitecues || {};
              sitecues.config = sitecues.config || {};
        `,
        4
    );

    // Store an array of config keys so that we can sort them.
    const keys = Object.keys(config);

    // Guarantee that the siteId is assigned to sitecues.config first, in case
    // the scriptUrl wants to use the siteId to compute itself, for example.
    keys.sort((one, two) => {
        if (one === 'siteId') {
            return -1;
        }
        else if (two === 'siteId') {
            return 1;
        }
        return 0;
    });

    // Fill in all settings for the client library itself.
    loader += keys.reduce((accumulated, key) => {
        const data = config[key];
        const value = typeof data === 'string' ? `'${data}'` : data;
        return accumulated + `    sitecues.config.${key} = ${value}\n`;
    }, '');

    loader += redent(
        `    (function () {
                var script = document.createElement('script'),
                    first  = document.getElementsByTagName('script')[0];
                script.type  = 'application/javascript';
                script.async = true;
                script.src   = sitecues.config.scriptUrl;
                first.parentNode.insertBefore(script, first);
            }());
        </script>
        `,
        4
    );

    return loader;
};

// Public module API.
module.exports = {
    format
};
