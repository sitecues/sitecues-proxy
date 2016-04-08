'use strict';

const pkgDir = require('pkg-dir').sync(__dirname),
      path   = require('path'),
      url    = require('url'),
      isRelativeUrl = require('url-type').isRelative,
      log = require(path.resolve(pkgDir, 'lib', 'log'));

function assumeHttp(inputUrl) {

    // This function is designed to modify a URL such that its protocol
    // is http: if one is not already present.

    return inputUrl.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');
}

function onRequest(request, response) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    log.verbose('REQUEST ------');

    const state = this.state;

    // In reverse mode, requests always point to the domain of the proxy itself,
    // and the target is in the path, so we must route traffic based on that.
    if (state.reverseMode) {

        log.verbose('Proxy path :', request.url);

        let target = this.toBypassedUrl(
            {
                url : request.url
            }
        );

        // If the provided target URL does not have a protocol, there are two
        // main scenarios. Either a lazy user typed in the URL directly but
        // didn't bother to provide one, or something like a favicon.ico
        // request is coming in. In the later case, the referer header will
        // be available to tell us which site the request is relative to.
        if (isRelativeUrl(target)) {
            const
                referrer = request.headers.referer || request.headers.referrer,
                referrerTarget = referrer ?
                    // Default the target to HTTP, in case the user is lazy.
                    assumeHttp(this.toBypassedUrl(
                        {
                            url : referrer,
                            stripOrigin : true
                        }
                    )) :
                    '';

            target = assumeHttp(url.resolve(referrerTarget, target));

            // Don't bother making a request to a server. The client needs to be
            // made aware of the canonical proxy URL for the target. Note that a
            // response handler takes care of "proxifying" redirects. So there
            // is no need to do that here.
            response.statusCode = 307;
            response.headers.location = target;

            log.verbose('Referrer   :', referrer);
        }
        else {
            // Redirect traffic to the URL given in the path.
            request.fullUrl(target);
        }
        log.verbose('Target     :', target);
    }

    // When connecting to a sitecues server.
    if (request.hostname.includes('sitecues.')) {
        // Send a header indicating that this is a test session,
        // allowing them to ignore metrics, for example.
        request.headers['sitecues-Test'] = 'true; proxy';
    }

    log.verbose('------ REQUEST');
}

module.exports = onRequest;
