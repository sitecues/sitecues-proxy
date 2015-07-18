// This is a helper module dedicated to processing
// Content Security Policy (CSP) directives.

// CSP is an opt-in security layer for websites, which is wide-open be defult.
// But if a site declares a policy, the proxy must add rules to make our
// client-side code and URL re-writing tricks work.

// See: https://developer.mozilla.org/en-US/docs/Web/Security/CSP

/*

 Example of response headers from facebook.com

 { pragma: 'no-cache',
 expires: 'Sat, 01 Jan 2000 00:00:00 GMT',
 'cache-control': 'private, no-cache, no-store, must-revalidate',
 'content-security-policy': 'default-src *;img-src * data:;child-src blob: *;script-src https://*.facebook.com http://*.facebook.com https://*.fbcdn.net http://*.fbcdn.net *.facebook.net *.google-analytics.com *.virtualearth.net *.google.com 127.0.0.1:* *.spotilocal.com:* \'unsafe-inline\' \'unsafe-eval\' https://*.akamaihd.net http://*.akamaihd.net *.atlassolutions.com blob:;style-src * \'unsafe-inline\';connect-src https://*.facebook.com http://*.facebook.com https://*.fbcdn.net http://*.fbcdn.net *.facebook.net *.spotilocal.com:* https://*.akamaihd.net wss://*.facebook.com:* ws://*.facebook.com:* http://*.akamaihd.net https://fb.scanandcleanlocal.com:* *.atlassolutions.com http://attachment.fbsbx.com https://attachment.fbsbx.com;',
 'strict-transport-security': 'max-age=15552000; preload',
 'x-frame-options': 'DENY',
 'x-xss-protection': '0',
 'x-content-type-options': 'nosniff',
 vary: 'Accept-Encoding',
 'content-type': 'text/html',
 'x-fb-debug': 'f5D9svi5lXWHCgGIQyj9/On0NVGx8LTZfJcnbbaVjXqqX4modeqaiO63NOix6fDFWk697rjVeBiDnMaS6W0xCw==',
 date: 'Sat, 18 Jul 2015 20:43:58 GMT',
 'transfer-encoding': 'chunked',
 connection: 'keep-alive',
 'content-encoding': undefined
 }
 */

// https://www.owasp.org/index.php/List_of_useful_HTTP_headers
var HEADERS_TO_EDIT = {
        0: 'content-security-policy',
        1: 'strict-transport-security',
        2: 'strict-transport-security',
        3: 'x-frame-options',
        4: 'x-xss-protection'
    },
    SEPARATOR  = ';',                 // field separator
    DOMAIN    = '*.sitecues.com ',  // space separated list of domains to add
    directives = [                    // rule sets to edit
        ''
    ];

function addTo(headers) {
    //console.log(headers);

    var baseRegex = SEPARATOR + '\\s*?',  // perf optimization, less adding in a loop
        directive;

    var cspHeader = headers['content-security-policy'];

    // Sites that don't declare a policy don't get one. Adding to it might break the page.
    if (!cspHeader) {
        return;
    }

    // Add ourselves to all relevant CSP rules.
    //for (directive in directives) {
    //    if (Object.prototype.hasOwnProperty.call(directives, directive)) {
    //        headers[HEADERS_TO_EDIT[0]] = headers[HEADERS_TO_EDIT[0]].replace(
    //            new RegExp(baseRegex + directive + '\s'),
    //            function (match) {
    //                return '; ' + directive + DOMAINS;
    //            }
    //        )
    //    }
    //}


    if (cspHeader.indexOf('script-src') > -1) {
        headers[HEADERS_TO_EDIT[0]]  = cspHeader = cspHeader.replace('script-src', 'script-src' + ' https://' + DOMAIN);
    }

    if (cspHeader.indexOf('connect-src') > -1) {
        headers[HEADERS_TO_EDIT[0]]  = cspHeader.replace('connect-src', 'connect-src' + ' https://' + DOMAIN);
    }
}

module.exports = {
    addTo : addTo
}
