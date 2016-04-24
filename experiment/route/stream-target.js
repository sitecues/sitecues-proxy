'use strict';

const
    isRelativeUrl = require('url-type').isRelative,
    zlib = require('zlib'),
    url = require('url'),
    Trumpet = require('trumpet'),
    boom = require('boom'),
    ROUTE_PREFIX = '/stream/',
    htmlPattern = /html/i,
    redirectCodes = [
        // NOTE: Not all 3xx responses should be messed with.
        // For example: 304 Not Modified
        301, 302, 303, 307, 308
    ],
    // Headers that will NOT be copied from the inResponse to the outResponse.
    filteredResponseHeaders = [
        // Hapi will negotiate this with the client for us.
        'content-encoding',
        // Hapi prefers chunked encoding, but also re-calculates size
        // when necessary, which is important if we modify it.
        'content-length',
        // Hapi will negotiate this with the client for us.
        'transfer-encoding'
    ];

function assumeHttp(targetUrl) {

    // This function is designed to modify a URL such that its protocol
    // is http: if one is not already present.

    return targetUrl.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');
}

function getTargetUrl(requestPath) {
    return requestPath.substring(ROUTE_PREFIX.length);
}

function toProxyPath(targetUrl) {
    return ROUTE_PREFIX + targetUrl;
}

// Ensure that the client receives a reasonable representation
// of what the target server sends back.
function mapResponseData(from, to) {
    const header = from.headers;
    for (const name in header) {
        const value = header[name];
        if (filteredResponseHeaders.indexOf(name.toLowerCase()) >= 0) {
            continue;
        }
        if (value) {
            to.header(name, value);
        }
    }

    to.code(from.statusCode);
    // TODO: Figure out how to make the proxy respect statusMessage
    // console.log('from statusMessage:', from.statusMessage);
}

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
    handler : function onRequest(inRequest, reply) {

        // The target is taken from the path as-is, except for the inherent
        // leading slash. This includes a query string, if present.
        const target = getTargetUrl(inRequest.url.href);

        // Deal with lazy users, favicon.ico requests, etc. where a protocol
        // and maybe even an origin, cannot be determined from the target.
        if (isRelativeUrl(target)) {
            const
                referrer = inRequest.info.referrer,
                resolvedTarget = referrer ?
                        url.resolve(
                            assumeHttp(getTargetUrl(
                                url.parse(referrer).path
                            )),
                            '/' + target
                        )
                    :
                        // Resolving adds a trailing slash to domain root URLs,
                        // which helps the client resolve page-relative URLs.
                        url.resolve('', assumeHttp(target));

            if (!(url.parse(resolvedTarget).hostname)) {
                reply(boom.badRequest(
                    resolvedTarget === 'http:///' ?
                            'A target is required, but was not provided'
                        :
                            'An invalid target was provided (no hostname)'
                ));
                return;
            }

            // We do a redirect rather than proxying to the resolved target so that
            // future requests for subresources within the content send us a useful
            // referrer header. Otherwise we will lose track of the relevant origin
            // for the content.

            reply.redirect(toProxyPath(resolvedTarget)).rewritable(false);
            return;
        }
        // Targets like http://foo.com need to be redirected to http://foo.com/
        // in order to help the client properly resolve subresources that use
        // page-relative URLs. In other words, we need to make sure that the
        // target is treated as a directory under the proxy.
        else if (!target.endsWith('/')) {
            const resolvedTarget = url.resolve('', target);
            if (target !== resolvedTarget) {
                reply.redirect(toProxyPath(resolvedTarget)).rewritable(false);
                return;
            }
        }

        {
            const parsedTarget = url.parse(target);

            if (!parsedTarget.protocol) {
                reply(boom.badRequest('An invalid target was provided (no protocol)'));
                return;
            }

            if (!parsedTarget.hostname) {
                reply(boom.badRequest('An invalid target was provided (no hostname)'));
                return;
            }
        }

        reply.proxy({
            uri : target,
            // Shovel headers between the client and target.
            passThrough : true,
            // localStatePassThrough : true,
            onResponse : (err, inResponse, inRequest, reply, settings) => {

                if (err) {
                    // Modify errors to be more clear and user friendly.
                    if (err.code === 'ENOTFOUND') {
                        err.output.payload.message = 'Unable to find the target via DNS';
                    }
                    else if (err.code === 'ECONNREFUSED') {
                        err.output.payload.message = 'Unable to connect to the target';
                    }

                    throw err;
                }

                // Detect HTTP redirect responses, which would send
                // the user away from the proxy.
                if (redirectCodes.indexOf(inResponse.statusCode) >= 0) {
                    // Re-write HTTP redirects to use the proxy.
                    // These can be relative, so we must resolve
                    // them from the original target.
                    reply(inResponse).location(toProxyPath(
                        url.resolve(
                            target,
                            inResponse.headers.location
                        )
                    ));
                    return;
                }

                // Ensure we don't modify non-HTML responses.
                if (!htmlPattern.test(inResponse.headers['content-type'])) {
                    reply(inResponse);
                    return;
                }

                const encoding = inResponse.headers['content-encoding'];

                let decoder;

                if (encoding === 'gzip') {
                    decoder = zlib.createGunzip();
                }
                else if (encoding === 'deflate') {
                    decoder = zlib.createInflate();
                }
                else if (encoding) {
                    throw new Error('Unknown encoding:', encoding);
                }

                const editor = new Trumpet();

                editor.on('error', function (err) {
                    throw err;
                });

                const h1 = editor.createWriteStream('h1');
                h1.end('no one');

                const unencoded = decoder ? inResponse.pipe(decoder) : inResponse;

                const page = unencoded.pipe(editor);

                const outResponse = reply(page);

                // Pass along response metadata from the upstream server,
                // such as the Content-Type.
                mapResponseData(inResponse, outResponse);
            }
        });
    }
};
