'use strict';

const
    isRelativeUrl = require('url-type').isRelative,
    url = require('url'),
    Trumpet = require('trumpet'),
    ROUTE_PREFIX = '/stream/';

function assumeHttp(inputUrl) {

    // This function is designed to modify a URL such that its protocol
    // is http: if one is not already present.

    return inputUrl.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');
}

function toBypassedUrl(inputUrl) {
    return inputUrl.substring(ROUTE_PREFIX.length);
}

function toProxiedPath(inputUrl) {
    return ROUTE_PREFIX + inputUrl;
}

const
    redirectCodes = [
        // NOTE: Not all 3xx responses should be messed with.
        // For example: 304 Not Modified
        301, 302, 303, 307, 308
    ];

module.exports = {
    method : '*',
    path   : ROUTE_PREFIX + '{target*}',
    config : {
        // Pretty print JSON responses (namely, errors) for a friendly UX.
        json : {
            space : 4
        },
        // Workaround the fact that reply.proxy() does not work with the
        // default stream and parse config.
        // https://github.com/hapijs/hapi/issues/2647
        payload : {
            output : 'stream',
            parse : false
        }
    },
    handler : function (inRequest, reply) {

        // The target is taken from the path as-is, except for the inherent
        // leading slash. This includes a query string, if present.
        const target = toBypassedUrl(inRequest.url.href);

        // Deal with lazy users, favicon.ico requests, etc. where a protocol
        // and maybe even an origin, cannot be determined from the target.
        if (isRelativeUrl(target)) {
            const
                referrer = inRequest.info.referrer,
                resolvedTarget = referrer ?
                    url.resolve(
                        assumeHttp(toBypassedUrl(
                            url.parse(referrer).path
                        )),
                        target
                    )
                    : assumeHttp(target);

            // We do a redirect rather than proxying to the resolved target so that
            // future requests for subresources within the content send us a useful
            // referrer header. Otherwise we will lose track of the relevant origin
            // for the content.

            reply.redirect(toProxiedPath(resolvedTarget)).rewritable(false);
            return;
        }

        reply.proxy({
            uri : target,
            // Shovel headers between the client and target.
            passThrough : true,
            // Strip the request header saying it is okay to encode the response.
            // We want it unencoded so we can easily manipulate it.
            acceptEncoding : false,
            // localStatePassThrough : true,
            onResponse : function (err, inResponse, inRequest, reply, settings, ttl) {
                if (err) {
                    // Modify errors to be more clear and user friendly.
                    if (err.code === 'ENOTFOUND') {
                        err.output.payload.message = 'Unable to find the target via DNS';
                    }

                    throw err;
                }

                // Detect HTTP redirect responses, which would send
                // the user away from the proxy.
                if (redirectCodes.indexOf(inResponse.statusCode) >= 0) {
                    // Re-write HTTP redirects to use the proxy.
                    // These can be relative, so we must resolve
                    // them from the original target.
                    reply(inResponse).location(toProxiedPath(
                        url.resolve(
                            target,
                            inResponse.headers.location
                        )
                    ));
                    return;
                }

                const outResponse = new Trumpet();

                outResponse.on('error', function (err) {
                    throw err;
                });

                const h1 = outResponse.createWriteStream('h1');
                h1.end('no one');

                // Pass along useful information to our custom stream.
                outResponse.headers = inResponse.headers;

                reply(outResponse);
                inResponse.pipe(outResponse);
            }
        });
    }
};
