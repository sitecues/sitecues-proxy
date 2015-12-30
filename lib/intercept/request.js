'use strict';

const pkgDir = require('pkg-dir').sync(__dirname),
      path   = require('path'),
      log = require(path.resolve(pkgDir, 'lib', 'log'));

function onRequest(request, response) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    log.verbose('REQUEST ------');

    const state = this.state;

    // In reverse mode, requests always point to the domain of the proxy itself,
    // and the target is in the path, so we must route traffic based on that.
    if (state.reverseMode) {

        // TODO: Deal with extraneous /favicon.ico requests, which error.
        // TODO: Should we resolve request.url against the "referer" header?

        const target = this.toBypassedUrl(request.url);

        log.verbose('Proxy path :', request.url);
        log.verbose('Target     :', target);
        log.verbose('Referer    :', request.headers.referer);
        log.verbose('Referrer   :', request.headers.referrer);

        // Redirect traffic to the URL given in the path.
        request.fullUrl(target);
    }

    // When connecting to a sitecues server...
    if (request.hostname.indexOf('sitecues') >= 0) {
        // Send a header indicating that this is a test session,
        // allowing them to ignore metrics, for example.
        request.headers['sitecues-Test'] = 'true; proxy';
    }

    log.verbose('------ REQUEST');
}

module.exports = onRequest;
