var pkgDir = require('pkg-dir').sync(__dirname),
    path   = require('path'),
    log = require(
        path.resolve(pkgDir, 'lib', 'log')
    ),
    HEADER_NAME  = 'sitecues-Test',  // tell sitecues servers to ignore metrics
    HEADER_VALUE = 'true; proxy';

function onRequest(request, response, cycle) {

    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.

    var that = this,
        state = that.state,
        target = request.url,  // path of the request (following the proxy origin)
        targetCruft;

    log.verbose('REQUEST ------');

    // In reverse mode, requests always point to the domain of the proxy itself,
    // and the target is in the path, so we must route traffic based on that.
    if (state.reverseMode) {
        // Define parts of the path we don't care about, in order to
        // ignore them when computing the target.
        targetCruft = new RegExp(
            '^/' + state.contextPath + '/(?:' + state.route.page + ')?'
        );
        // Extract the desired target from the request path by removing
        // everything else. This is more reliable than attempting to
        // pattern match all valid target URLs.
        target = target.replace(targetCruft, '');
        // Default the target to HTTP, in case the user is lazy.
        target = target.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');

        log.verbose('Proxy path :', request.url);
        log.verbose('Target     :', target);
        log.verbose('Referer    :', request.headers.referer);
        log.verbose('Referrer   :', request.headers.referrer);

        // TODO: Deal with extraneous /favicon.ico requests, which error.

        // Redirect traffic to the URL given in the path.
        request.fullUrl(target);
    }
    // If connecting to a sitecues domain...
    if (request.hostname.indexOf('sitecues') >= 0) {
        // Send a header indicating that this is a test session...
        request.headers[HEADER_NAME] = HEADER_VALUE;
    }

    log.verbose('------ REQUEST');
}

module.exports = onRequest;
