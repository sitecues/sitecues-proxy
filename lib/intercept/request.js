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
        // Define parts of the path we don't care about, in order to
        // ignore them when computing the target.
        const targetCruft = new RegExp(
            '^' +
            path.posix.join(
                '/',
                state.contextPath ? state.contextPath + '/' : '',
                state.route.page ?
                    '(?:' + path.posix.join('.', state.route.page, '/') + ')?' :
                    ''
            )
        );

        // Extract the desired target from the request path by removing
        // everything else. This is more reliable than attempting to
        // pattern match all valid target URLs.
        // Default the target to HTTP, in case the user is lazy.
        const target = request.url
                  .replace(targetCruft, '')
                  .replace(/^(?!(?:\w+:)?\/\/)/, 'http://');

        log.verbose('Proxy path :', request.url);
        log.verbose('Target     :', target);
        log.verbose('Referer    :', request.headers.referer);
        log.verbose('Referrer   :', request.headers.referrer);

        // TODO: Deal with extraneous /favicon.ico requests, which error.

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
