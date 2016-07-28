'use strict';

const path = require('path');
const url = require('url');
const { isRelative } = require('url-type');
const pkgDir = require('pkg-dir').sync(__dirname);

const log = require(path.join(pkgDir, 'lib', 'log'));

// This function is designed to modify a URL such that its protocol
// is http: if one is not already present.
const assumeHttp = (inputUrl) => {
    return inputUrl.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');
};

module.exports = (server) => {
    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.
    return (request, response) => {
        log.verbose('REQUEST ------');

        const { state } = server;

        // In reverse mode, requests always point to the domain of the proxy itself,
        // and the target is in the path, so we must route traffic based on that.
        if (state.reverseMode) {
            log.verbose('Proxy path :', request.url);

            let target = server.toBypassedUrl({
                url : request.url
            });

            // If the provided target URL does not have a protocol, there are two
            // main scenarios. Either a lazy user typed in the URL directly but
            // didn't bother to provide one, or something like a favicon.ico
            // request is coming in. In the later case, the referer header will
            // be available to tell us which site the request is relative to.
            if (isRelative(target)) {
                const referrer = request.headers.referer || request.headers.referrer;
                const referrerTarget = referrer ?
                    // Default the target to HTTP, in case the user is lazy.
                    assumeHttp(server.toBypassedUrl({
                        url         : referrer,
                        stripOrigin : true
                    })) :
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
        if (request.hostname.indexOf('sitecues.') >= 0) {
            // Send a header indicating that this is a test session,
            // allowing them to ignore metrics, for example.
            request.headers['sitecues-Test'] = 'true; proxy';
        }

        log.verbose('------ REQUEST');
    };
};
