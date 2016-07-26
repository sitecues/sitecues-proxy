'use strict';

const url = require('url');
const path = require('path');
const pkgDir = require('pkg-dir').sync(__dirname);
const urlType = require('url-type');

const libDir = path.resolve(pkgDir, 'lib');
const util = require(path.join(libDir, 'util')).general;
const log = require(path.join(libDir, 'log'));
const { isAbsolute, isSchemeRelative, isOriginRelative } = urlType;
const isHttpish = urlType.isHttpOrHttps;
// Loader strategies are shorthand aliases for what the proxy should do
// with loaders it finds in the page.
const loaderStrategy = {
    ADD     : 'add',
    REMOVE  : 'remove',
    KEEP    : 'keep'
};

// This function is run when the proxy is about to deliver a piece of
// web content back to the user, based on a previous request.
function onHtmlResponse(request, response) {
    const { state } = this.state;
    // Cheerio.js, the server-side jQuery
    const { $ } = response;

    // TODO: Deal with the case where a base tag has already been set
    //       by the page and we should respect its value for relative
    //       links that we try to bypass / avoid.

    log.verbose('RESPONSE ------');

    // Decide whether configuration allows us to modify this content.
    if (!util.isEligible(request)) {
        const target = request.fullUrl();
        log.warn(
            'An ineligible site was accessed:\n',
            target
        );
        log.verbose('------ RESPONSE');
        return;
    }
    // In reverse mode, we must re-write all URLs embedded within pages seen
    // by the user, such that we do not proxy content we would never alter,
    // such as images or stylesheets, even if they are relative links,
    // but anchor tags do go through the proxy, even if they are absolute.
    if (state.reverseMode) {
        // TODO: Use the csp module to conditionally add *.sitecues.com
        // to security policy, if needed.
        const that = this;
        const target = request.fullUrl();

        log.verbose('Target :', target);

        let existingBaseTagUrl;

        // Behavior for the first base tag with an href attribute.
        $('base[href]').first().attr('href', (index, value) => {
            // Some sites use relative base tags, so we must compute
            // its meaning for it to be useful.
            const absoluteUrl = url.resolve(target, value);

            // The W3C spec says to respect the first encountered base tag href,
            // so we must be careful to save this only once.
            existingBaseTagUrl = absoluteUrl;

            // Decide whether configuration allows us to make ourselves the base
            // for all relative links. If not, we must ensure the final base URL
            // is absolute so it cannot accidentally be relative to the proxy.
            const result = state.proxyLinks ?
                that.toProxiedPath(absoluteUrl) :
                absoluteUrl;

            return result;
        });

        // The base that the target itself wants / expects, can be used to
        // create links that "bypass" the proxy.
        const targetBaseUrl = existingBaseTagUrl || target;
        // The target's base as a proxy URL. Can be used to create links
        // that use the proxy. Do NOT resolve origin-relative URLs
        // against this, or else the target will be lost in the process.
        const proxiedBaseUrl = that.toProxiedPath(targetBaseUrl);
        // The "final" base URL that we have computed and is guaranteed to be
        // what ends up as the base tag href in the page we deliver.
        const baseUrl = state.proxyLinks ? proxiedBaseUrl : targetBaseUrl;

        // If a base was not declared by the page, we must fallback to using
        // one of our own, based on the configuration for proxying links.
        if (typeof existingBaseTagUrl === 'undefined') {
            log.verbose(
                'final base:', baseUrl
            );
            $('head').prepend(
                `<base href="${baseUrl}">`
            );
        }

        if (state.proxyLinks) {
            // Behavior for anchors with an href attribute.
            $('a[href]').attr('href', (index, value) => {
                if (!value) {
                    return value;
                }

                if (isAbsolute(value) && isHttpish(value)) {
                    // Force proxying of links which might get clicked, etc.
                    return that.toProxiedPath(value);
                }
                else if (isSchemeRelative(value) || isOriginRelative(value)) {
                    return that.toProxiedPath(
                            url.resolve(targetBaseUrl, value)
                        );
                }

                return value;
            });
        }

        // Bypass the proxy for content we would never alter, such as
        // images and stylesheets. This enhances performance,
        // but also avoids accidentally corrupting data.

        if (state.proxyLinks) {
            // Behavior for CSS stylesheets with an href attribute.
            $('link[href]').attr('href', (index, value) => {
                if (!value) {
                    return value;
                }

                // Bypass the proxy entirely for downloading stylesheets.
                return url.resolve(targetBaseUrl, value);
            });

            // Behavior for all elements with a src attribute.
            $('*[src]').attr('src', (index, value) => {
                if (!value) {
                    return value;
                }

                // Bypass the proxy entirely for downloading media content,
                // to avoid accidentally corrupting it.
                return url.resolve(targetBaseUrl, value);
            });
        }
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
}

module.exports = onHtmlResponse;
