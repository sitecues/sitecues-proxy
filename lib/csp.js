// EXPERIMENTAL, INCOMPLETE MODULE.

// This is a helper module dedicated to processing
// Content Security Policy (CSP) directives.

// CSP is an opt-in security layer for websites, which is wide-open be defult.
// But if a site declares a policy, then it suddenly becomes a whitelist and
// the proxy must add rules to make our client-side code and URL re-writing
// tricks work as they do everywhere else.

// See: https://developer.mozilla.org/en-US/docs/Web/Security/CSP

'use strict';

var HEADER     = 'content-security-policy',
    SEPARATOR  = ';',                 // field separator
    DOMAINS    = ' *.sitecues.com ',  // space separated list of domains to add
    directives = [                    // rule sets to edit
        ''
    ];

function getDirectiveAdder(directive) {

    // This function is designed to return a callback with its
    // scope explicitly bound to a given directive, so that
    // addDirective() is safe to use in a loop.

    function addDirective() {
        return '; ' + directive + DOMAINS;
    }

    return addDirective;
}

function addTo(headers) {

    // Performance optimization, less adding in a loop.
    var baseRegex = SEPARATOR + '\\s*?',
        directive,
        csp = headers[HEADER];

    // The W3C spec says sites which don't declare a policy don't get one.
    // Adding to it can break the page in those circumstances.
    if (!csp) {
        return;
    }

    // Add ourselves to all relevant CSP rules.
    for (directive in directives) {
        if (Object.prototype.hasOwnProperty.call(directives, directive)) {
            headers[HEADER] = headers[HEADER].replace(
                new RegExp(baseRegex + directive + '\s'),
                getDirectiveAdder(directive)
            );
        }
    }
}

module.exports = {
    addTo : addTo
};
