'use strict';

const isEligible = require('../util/is-eligible');
const log = require('../log');

// Loader strategies are shorthand aliases for what the proxy should do
// with loaders it finds in the page.
const loaderStrategy = {
    ADD     : 'add',
    REMOVE  : 'remove',
    KEEP    : 'keep'
};

module.exports = (server) => {
    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.
    return (request, response) => {
        const { state } = server;
        // Cheerio.js, the server-side jQuery
        const { $ } = response;

        log.verbose('RESPONSE ------');

        // Decide whether configuration allows us to modify this content.
        if (!isEligible(request)) {
            const target = request.fullUrl();
            log.warn(
                'An ineligible site was accessed:\n',
                target
            );
            log.verbose('------ RESPONSE');
            return;
        }

        // The sitecues loader can appear in many different forms depending on the
        // constraints of any given customer's website technology.
        const existingLoaders = $([
            'script[data-provider="sitecues"]',
            'script:contains(sitecues.config.scriptUrl;)',
            'script[src$="sitecues-loader.js"]'
        ].join(', '));

        if (state.loaderStrategy === loaderStrategy.ADD) {
            $('head').first().append(state.loader);
        }
        else if (state.loaderStrategy === loaderStrategy.REMOVE) {
            existingLoaders.remove();
        }
        else if (state.loaderStrategy === loaderStrategy.KEEP) {
            if (existingLoaders.length < 1) {
                $('head').first().append(state.loader);
            }
        }
        else if (existingLoaders.length > 0) {
            existingLoaders.first().replaceWith(state.loader);
        }
        else {
            $('head').first().append(state.loader);
        }

        log.verbose('------ RESPONSE');
    };
};
