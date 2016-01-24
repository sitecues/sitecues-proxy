// Herein lies the base configuration for the testing framework.
// Other files can use this as an AMD module.

define(
    [   // dependencies...
        'test/all'
    ],
    function (testSuites) {

        'use strict';

        var build = 'UNKNOWN',
            proxyPort = 9000,
            testDir = 'test/';

        // make sure we are in Node and not a browser...
        if (typeof process !== 'undefined' && process.env) {
            build = process.env.BUILD || process.env.COMMIT || process.env.TRAVIS_COMMIT;
        }

        return {
            proxyPort : proxyPort,
            proxyUrl  : 'http://localhost:' + proxyPort + '/',

            capabilities : {
                // See examples: https://code.google.com/p/selenium/wiki/DesiredCapabilities
                name : 'Automated Test - sitecues proxy',  // name of the test run, for logging purposes
                'selenium-version' : '2.45.0',             // request a version, which may not always be respected
                build : build                            // useful to log success history tied to code changes
            },
            // Places where unit and/or functional tests will be run...
            environments : [
                // { browserName : 'safari' },
                // { browserName : 'firefox' },
                { browserName : 'chrome' }
            ],

            maxConcurrency : 3,  // how many browsers may be open at once

            // Specify which AMD module loader to use...
            // loaders: {

            // }
            // Options to pass to the AMD module loader...
            loaderOptions : {
                packages : [
                    { name : 'unit', location : testDir + 'unit' },
                    { name : 'functional', location : testDir + 'functional' }
                ]
            },

            // Each cloud testing service has their own weird quirks and different APIs,
            // so load up the necessary configuration to talk to them...
            tunnel : 'NullTunnel',         // no tunnel (default, if none provided)
            // tunnel : 'BrowserStackTunnel', // BrowserStack
            // tunnel : 'SauceLabsTunnel',    // SauceLabs
            // tunnel : 'TestingBotTunnel',   // TestingBot
            tunnelOptions : {
                host : 'localhost:4447'  // custom location to find the selenium server
                // verbose : true           // more logging, only supported by BrowserStack
            },

            // These are unit tests, which check the APIs of our application...
            suites : testSuites.unit,
            // These are functional tests, which check the user-facing behavior of our application...
            functionalSuites : testSuites.functional,

            // Any test IDs ("suite name - test name") which do NOT match this regex will be skipped...
            grep : /.*/,

            // The paths that match this regex will NOT be included in code coverage reports...
            excludeInstrumentation : /^(?:config|test|node_modules)\//

            // Test result output mechanisms.
            // reporters : ['Pretty']
        };
    }
);
