'use strict';

module.exports = () => {
    // This function is run when the proxy receives a connection to go fetch
    // a piece of content on the web.
    return (request) => {
        // When connecting to a sitecues server.
        if (request.hostname.includes('sitecues.')) {
            // Send a header indicating that this is a test session,
            // allowing them to ignore metrics, for example.
            request.headers['sitecues-Test'] = 'true; proxy';
        }
    };
};
