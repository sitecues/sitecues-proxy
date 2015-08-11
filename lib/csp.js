// This is a helper module dedicated to processing
// Content Security Policy (CSP) directives.

// CSP is an opt-in security layer for websites, which is wide-open be defult.
// But if a site declares a policy, then it suddenly becomes a whitelist and
// the proxy must add rules to make our client-side code and URL re-writing
// tricks work as they do everywhere else.

// Specification: http://www.w3.org/TR/CSP2/

// Also see: https://developer.mozilla.org/en-US/docs/Web/Security/CSP

// Note: This module only comes into play when the proxy is in reverse mode.

/*

 Example of response headers from facebook.com

    {
        date           : 'Sat, 18 Jul 2015 20:43:58 GMT',
        pragma         : 'no-cache',
        connection     : 'keep-alive',
        vary           : 'Accept-Encoding',
        'content-type' : 'text/html',
        'transfer-encoding' : 'chunked',
        'content-encoding'  : undefined,
        'cache-control' : 'private, no-cache, no-store, must-revalidate',
        expires         : 'Sat, 01 Jan 2000 00:00:00 GMT',
        'content-security-policy'   : 'default-src *;img-src * data:;child-src blob: *;script-src https://*.facebook.com http://*.facebook.com https://*.fbcdn.net http://*.fbcdn.net *.facebook.net *.google-analytics.com *.virtualearth.net *.google.com 127.0.0.1:* *.spotilocal.com:* \'unsafe-inline\' \'unsafe-eval\' https://*.akamaihd.net http://*.akamaihd.net *.atlassolutions.com blob:;style-src * \'unsafe-inline\';connect-src https://*.facebook.com http://*.facebook.com https://*.fbcdn.net http://*.fbcdn.net *.facebook.net *.spotilocal.com:* https://*.akamaihd.net wss://*.facebook.com:* ws://*.facebook.com:* http://*.akamaihd.net https://fb.scanandcleanlocal.com:* *.atlassolutions.com http://attachment.fbsbx.com https://attachment.fbsbx.com;',
        'strict-transport-security' : 'max-age=15552000; preload',
        'x-fb-debug'        : 'f5D9svi5lXWHCgGIQyj9/On0NVGx8LTZfJcnbbaVjXqqX4modeqaiO63NOix6fDFWk697rjVeBiDnMaS6W0xCw==',
        'x-frame-options'   : 'DENY',
        'x-xss-protection'  : '0',
        'x-content-type-options' : 'nosniff'
    }
 */

// TODO: Support a similar header: Content-Security-Policy-Report-Only

// TODO: Research these other headers. Do we need to support these?
// https://www.owasp.org/index.php/List_of_useful_HTTP_headers

// TODO: CSP can also be defined in the page's HTML! Support processing that.

// TODO: The special keyword 'none' makes a directive a blacklist! Replace them.

// TODO: In addition to adding the proxy origin and *.sitecues.com, we probably need the target site's origin
//       This is because some absolute requests to the target may slip by us in client-side code.



// TODO: We need to treat base-uri as a special case, since we inject base tags. :(

'use strict';

var HEADER_NAME = 'content-security-policy',
    // The marker for the end of a directive.
    DELIMITER = ';',
    // Field separator between sources.
    SEPARATOR  = ' ',
    // Common pattern for detecting a directive.
    BASE_REGEX = DELIMITER + '\\s*?',

    // Sources, which will end up as a space-separated list to add to policy directives.
    // They are similar to origins, but have somewhat special semantics.
    // If a scheme is not specified, it is taken from the request to the reverse proxy.
    // See: https://developer.mozilla.org/en-US/docs/Web/Security/CSP/CSP_policy_directives#Source_lists

    // TODO: Find out if different directives need to be edited for 'self' and *.sitecues.com

    // TODO: Get the proxy origin value as computed by the actual server.
    //       We should do this in order to avoid matching subdomains,
    //       which 'self' apparently does. <-- also verify that
    sources = [
        'http://sitecues.com',
        'https://sitecues.com',
        'http://*.sitecues.com',
        'https://*.sitecues.com',
        '\'self\''  // special keyword, means the proxy itself
    ],
    // Policy rules we potentially need to modify.
    // NOTE: Some directives don't need the proxy origin
    //       added to them, such as 'plugin-types'
    directives = [
        'base-uri',         // URIs allowed for the <base> element
        'child-src',        // Sources for <frame> and <iframe>
        'connect-src',      // Sources for XMLHttpRequest and other requests
        'default-src',      // Sources to assume if more explicit directives are absent
        'font-src',         // Sources for fonts, such as in @font-face CSS rules
        'form-action',      // Endpoints for <form> submissions
        'frame-ancestors',
        'img-src',
        'manifest-src',
        'media-src',
        'object-src',
        'referrer',
        'reflected-xss',
        'report-uri',
        'sandbox',
        'script-src',
        'style-src'
    ];

var endDirectivePattern = '.*?' + DELIMITER;

function getDirectiveAdder(directive) {

    // This function is designed to return a callback with its
    // scope explicitly bound to a given directive, so that
    // addDirective() is safe to use in a loop.

    function addDirective() {
        return '; ' + directive + DOMAINS;
    }

    return addDirective;
}

function removeDirective(directive, csp) {
    csp.replace()
}

// Headers are the actual headers received by the reverse proxy during a request.
// Target is the full URL of the site the user is attempting to access.
function addTo(headers, target) {
    // console.log(headers);

    var csp = headers[HEADER_NAME],
        directive,
        i

    // Sites that don't declare a policy don't get one. Adding one may break the page,
    // because once a policy exists, it acts like a whitelist. Then we would have to
    // add every origin the target page may use as a resource in its code.
    if (!csp) {
        return;
    }

    // Add ourselves to all relevant CSP rules.
    // for (directive in directives) {
    //     if (Object.prototype.hasOwnProperty.call(directives, directive)) {
    //         headers[HEADER] = headers[HEADER].replace(
    //             new RegExp(baseRegex + directive + '\s'),
    //             getDirectiveAdder(directive)
    //         );
    //     }
    // }

    for (i = 0, len = directives.length; i < len; i = i + 1) {
        headers[HEADER_NAME] = csp.replace(
            new RegExp(BASE_REGEX + directives[i] + '\\s'),
            function (match) {
                return match + PROXY_ORIGN + ' ' + SC_ORIGIN + ' ';
            }
        )
    }

    // TODO: Does the order of directive values ever matter? If so, this is unacceptable.
    if (csp.indexOf('script-src') > -1) {
        headers[HEADER_NAME] = csp.replace('script-src', 'script-src' + ' ' + PROXY_ORIGN + ' ' + SC_ORIGIN);
    }

    if (csp.indexOf('connect-src') > -1) {
        headers[HEADER_NAME] = csp.replace('connect-src', 'connect-src' + ' ' + PROXY_ORIGN + ' ' + SC_ORIGIN);
    }
}

module.exports = {
    addTo : addTo
};
