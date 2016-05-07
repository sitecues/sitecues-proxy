// Modify HTML responses to inject sitecues and fix the DOM
// to suite our needs for pretending to be the target site.

'use strict';

const
    cheerio = require('cheerio');

function editPage(page) {

    const $ = cheerio.load(page);

    // Fix the Google logo on their homepage.
    $('meta[name=referrer]').attr('content', function (index, value) {
        // Ensure that the proxy can see the full URL of referrals to itself,
        // so that it can fully resolve relative targets.
        if (value === 'none' || value === 'origin') {
            return 'origin-when-crossorigin';
        }

        return value;
    });

    $('h1').text('no way');

    // TODO: Support XML via $.xml() and Content-Type header sniffing, same as hoxy.
    return $.html();
}

module.exports = {
    editPage
};
