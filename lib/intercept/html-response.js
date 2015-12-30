'use strict';

const pkgDir  = require('pkg-dir').sync(__dirname),
      path    = require('path'),
      url     = require('url'),
      urlType = require('url-type'),
      libDir  = path.resolve(pkgDir, 'lib'),
      util = require(path.resolve(libDir, 'util')).general,
      log = require(path.resolve(libDir, 'log')),
      isAbsolute = urlType.isAbsolute,
      isHostRelative = urlType.isHostRelative;

function onHtmlResponse(request, response, cycle) {

    // This function is run when the proxy is about to deliver a piece of
    // web content back to the user, based on a previous request.

    const state = this.state,
          target = request.fullUrl(),  // the user's desired webpage
          $ = response.$;              // Cheerio.js, the server-side jQuery

    // TODO: Deal with the case where a base tag has already been set
    //       by the page and we should respect its value for relative
    //       links that we try to bypass / avoid.

    log.verbose('RESPONSE ------');
    log.verbose('Target :', target);
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

        const hehe = '/favicon.ico';
        console.log('original URL :', hehe);
        console.log('proxied URL  :', this.toProxiedUrl(hehe));

        // TODO: Use the csp module to conditionally add *.sitecues.com
        // to security policy, if needed.

        let baseTagUrl; // links are relative to this

        // Behavior for the first base tag with an href attribute.
        $('base[href]').eq(0).attr('href', function (index, value) {
            // Some sites use relative base tags, so we must compute
            // its meaning for it to be useful.
            const absoluteUrl = url.resolve(target, value);

            let result;

            // The W3C spec says to respect the first encountered base tag href,
            // so we must be careful to save this only once.
            baseTagUrl = absoluteUrl;

            // Decide whether configuration allows us to proxy page links.
            // Even if not, we must ensure the final value is absolute,
            // so it cannot accidentally be relative to the proxy.
            result = state.proxyLinks ?
                         this.toProxiedUrl(absoluteUrl) :
                         absoluteUrl;

            return result;
        });

        // If a base was not declared by the page, we must fallback to using
        // one of our own, based on the configuration for proxying links.
        if (typeof baseTagUrl === 'undefined') {
            log.verbose(
                'final base:',
                state.proxyLinks ? this.toProxiedUrl(target) : target
            );
            $('head').prepend(
                '<base href=\"' +
                (state.proxyLinks ? this.toProxiedUrl(target) : target) +
                '\">'
            );
        }

        if (state.proxyLinks) {
            // Behavior for anchors with an href attribute.
            $('a[href]').attr('href', function (index, value) {

                let result = value;  // assume we don't want to change it

                if (value.length > 0) {
                    if (isAbsolute(value)) {
                        // Force proxying of links which might get clicked, etc.
                        result = this.toProxiedUrl(value);
                    }
                    else if (isHostRelative(value)) {
                        result = this.toProxiedUrl(
                            url.resolve(baseTagUrl || target, value)
                        );
                    }
                }

                return result;
            });
        }

        // Bypass the proxy for content we would never alter, such as
        // images and stylesheets. This enhances performance,
        // but also avoids accidentally corrupting data.

        // Behavior for CSS stylesheets with an href attribute.
        $('link[href]').attr('href', function (index, value) {
            let result = value;
            if (value.length > 0) {
                // Bypass the proxy entirely for downloading stylesheets.
                result = url.resolve(baseTagUrl || target, value);
            }
            return result;
        });

        // Behavior for all elements with an href attribute.
        $('*[href]').attr('href', function (index, value) {
            let result = value;
            if (value.length && isHostRelative(value)) {
                result = url.resolve(baseTagUrl || target, value);
            }
            return result;
        });

        // Behavior for all elements with a src attribute.
        $('*[src]').attr('src', function (index, value) {
            let result = value;
            if (value.length > 0) {
                // Bypass the proxy entirely for downloading media content,
                // to avoid accidentally corrupting it.
                result = url.resolve(baseTagUrl || target, value);
            }
            return result;
        });

        // TODO: We could do something like this to have our own favicon.
        //       Among other things, it would stop so many 404 errors
        //       from coming through when sites don't have them.
        // $('head').prepend(
        //     '<link rel="icon" href="/lalala.png">'
        // );
    }

    if (state.removeLoader) {
        // Remove any existing sitecues load scripts, to avoid conflicts.
        $('script[data-provider="sitecues"]').remove();
    }

    // Inject our desired sitecues load script.
    $('head').eq(0).append(state.loader);

    log.verbose('------ RESPONSE');
}

module.exports = onHtmlResponse;
