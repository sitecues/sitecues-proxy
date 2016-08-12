// Response handler. It modifies redirects to use proxy URLs.
// This is only relevant and used in reverse mode.

// In forward mode, the client's browser has all the information
// it needs to redirect to the right place on its own. But in
// reverse mode, neither the client nor the server that sent
// the redirect has knowledge of the special proxy routes
// needed to inject sitecues into the new target.

'use strict';

const url = require('url');

const redirectCodes = [
    // NOTE: Not all 3xx responses should be messed with.
    // For example: 304 Not Modified
    301, 302, 303, 307, 308
];

module.exports = (server) => {
    // Handler for all responses in reverse mode, regardless of
    // protocol, Content-Type, or other filters.
    return (request, response) => {
        const target = request.fullUrl();

        // Detect HTTP redirect responses, which would send
        // the user away from the proxy.
        if (redirectCodes.includes(response.statusCode)) {
            // Re-write HTTP redirects to use the proxy.
            // These can be relative, so we must resolve
            // them from the original target.
            response.headers.location = server.toProxiedPath(
                url.resolve(
                    target,
                    response.headers.location
                )
            );
        }
    };
};
