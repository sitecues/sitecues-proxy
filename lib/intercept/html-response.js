'use strict';

const
    pkgDir  = require('pkg-dir').sync(__dirname),
    path    = require('path'),
    url     = require('url'),
    urlType = require('url-type'),
    libDir  = path.resolve(pkgDir, 'lib'),
    util    = require(path.resolve(libDir, 'util')).general,
    log     = require(path.resolve(libDir, 'log')),
    isAbsolute = urlType.isAbsolute,
    isSchemeRelative = urlType.isSchemeRelative,
    isOriginRelative = urlType.isOriginRelative,
    isHttpish = urlType.isHttpOrHttps,
    // Loader strategies are shorthand aliases for what the proxy should do
    // with loaders it finds in the page.
    loaderStrategy = {
        ADD     : 'add',
        REMOVE  : 'remove',
        KEEP    : 'keep'
    };

function onHtmlResponse(request, response) {

    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.

    const
        state = this.state,
        // Cheerio.js, the server-side jQuery
        $ = response.$;

    // TODO: Deal with the case where a base tag has already been set
    //       by the page and we should respect its value for relative
    //       links that we try to bypass / avoid.

    log.verbose('RESPONSE ------');

    // Decide whether configuration allows us to modify this content.
    if (!util.isEligible(request)) {
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

        const
            that = this,
            target = request.fullUrl();  // the user's desired webpage

        log.verbose('Target :', target);

        let existingBaseTagUrl;

        // Behavior for the first base tag with an href attribute.
        $('base[href]').first().attr('href', function (index, value) {
            // Some sites use relative base tags, so we must compute
            // its meaning for it to be useful.
            const absoluteUrl = url.resolve(target, value);

            // The W3C spec says to respect the first encountered base tag href,
            // so we must be careful to save this only once.
            existingBaseTagUrl = absoluteUrl;

            // Decide whether configuration allows us to proxy page links.
            // Even if not, we must ensure the final value is absolute,
            // so it cannot accidentally be relative to the proxy.
            const
                result = state.proxyLinks ?
                    that.toProxiedUrl(
                        {
                            // TODO: Use the origin of the original request,
                            //       once hoxy exposes an API for that.
                            //       https://github.com/greim/hoxy/issues/72
                            proxyOrigin : state.origin,
                            target      : absoluteUrl
                        }
                    ) :
                    absoluteUrl;

            return result;
        });

        const
            // The base that the target itself wants / expects, can be used to
            // create links that "bypass" the proxy.
            targetBaseUrl = existingBaseTagUrl || target,
            // The target's base as a proxy URL. Can be used to create links
            // that use the proxy. Do NOT resolve origin-relative URLs
            // against this, or else the target will be lost in the process.
            proxiedBaseUrl = that.toProxiedUrl(
                    {
                        // TODO: Use the origin of the original request,
                        //       once hoxy exposes an API for that.
                        //       https://github.com/greim/hoxy/issues/72
                        proxyOrigin : state.origin,
                        target      : targetBaseUrl
                    }
                ),
            // The "final" base URL that we have computed and is guaranteed to be
            // what ends up as the base tag href in the page we deliver.
            baseUrl = state.proxyLinks ? proxiedBaseUrl : targetBaseUrl;

        // If a base was not declared by the page, we must fallback to using
        // one of our own, based on the configuration for proxying links.
        if (typeof existingBaseTagUrl === 'undefined') {
            log.verbose(
                'final base:', baseUrl
            );
            $('head').prepend(
                '<base href=\"${baseUrl}\">'
            );
        }

        if (state.proxyLinks) {
            // Behavior for anchors with an href attribute.
            $('a[href]').attr('href', function (index, value) {

                let result = value;

                if (value.length > 0) {
                    if (isAbsolute(value) && isHttpish(value)) {
                        // Force proxying of links which might get clicked, etc.
                        result = that.toProxiedPath(value);
                    }
                    else if (isSchemeRelative(value) || isOriginRelative(value)) {
                        result = that.toProxiedPath(
                                url.resolve(targetBaseUrl, value)
                            );
                    }
                }

                return result;
            });
        }

        // Bypass the proxy for content we would never alter, such as
        // images and stylesheets. This enhances performance,
        // but also avoids accidentally corrupting data.

        if (state.proxyLinks) {
            // Behavior for CSS stylesheets with an href attribute.
            $('link[href]').attr('href', function (index, value) {
                let result = value;
                if (value.length > 0) {
                    // Bypass the proxy entirely for downloading stylesheets.
                    result = url.resolve(targetBaseUrl, value);
                }
                return result;
            });

            // Behavior for all elements with a src attribute.
            $('*[src]').attr('src', function (index, value) {
                let result = value;
                if (value.length > 0) {
                    // Bypass the proxy entirely for downloading media content,
                    // to avoid accidentally corrupting it.
                    result = url.resolve(targetBaseUrl, value);
                }
                return result;
            });
        }
    }


    const existingLoaders = $('script[data-provider=\"sitecues\"]');

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
    else {
        if (existingLoaders.length > 0) {
            existingLoaders.first().replaceWith(state.loader);
        }
        else {
            $('head').first().append(state.loader);
        }
    }


    log.verbose('------ RESPONSE');
}

module.exports = onHtmlResponse;
