// This is a helper module dedicated to processing
// Content Security Policy (CSP) directives.

// CSP is an opt-in security layer for websites, which is wide-open be defult.
// But if a site declares a policy, the proxy must add rules to make our
// client-side code and URL re-writing tricks work.

// See: https://developer.mozilla.org/en-US/docs/Web/Security/CSP

var HEADER     = 'content-security-policy',
    SEPARATOR  = ';',                 // field separator
    DOMAINS    = ' *.sitecues.com ',  // space separated list of domains to add
    directives = [                    // rule sets to edit
        ''
    ];

function addTo(headers) {

    var baseRegex = SEPARATOR + '\\s*?',  // perf optimization, less adding in a loop
        directive;

    // Sites that don't declare a policy don't get one. Adding to it might break the page.
    if (!csp) {
        return;
    }

    // Add ourselves to all relevant CSP rules.
    for (directive in directives) {
        if (Object.prototype.hasOwnProperty.call(directives, directive)) {
            headers[HEADER] = headers[HEADER].replace(
                new RegExp(baseRegex + directive + '\s');
                function (match) {
                    return '; ' + directive + DOMAINS;
                }
            )
        }
    }
}

module.exports = {
    addTo : addTo
}
