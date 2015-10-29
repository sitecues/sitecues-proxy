'use strict';

const url = require('url'),
      redirectCodes = [
          // NOTE: Not all 3xx responses should be messed with.
          // For example: 304 Not Modified
          '301', '302', '303', '307', '308'
      ];

function onResponse(request, response, cycle) {

    // This function is designed to run for ALL responses, regardless of
    // protocol, Content-Type, or other filters.

    const state = this.state,
          target = request.fullUrl();

    // In forward mode, the client's browser has all the information
    // it needs to redirect to the right place on its own. But in
    // reverse mode, neither the client nor the server that sent
    // the redirect has knowledge of the reverse proxy or the
    // routes needed to inject sitecues into the new target.
    if (state.reverseMode) {
        // Detect HTTP redirect responses, which would send
        // the user away from the proxy.
        if (redirectCodes.indexOf(response.statusCode.toString()) >= 0) {
            // Re-write HTTP redirects to use the proxy.
            // These can be relative, so we must resolve
            // them from the original target.
            response.headers.location = this.toProxiedUrl(
                url.resolve(
                    target,
                    response.headers.location
                )
            );
        }
    }
}

module.exports = onResponse;
