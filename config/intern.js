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
            proxyPort: proxyPort,
            proxyUrl: 'http://localhost:' + proxyPort + '/',

            capabilities: {
                // See examples: https://code.google.com/p/selenium/wiki/DesiredCapabilities
                'name': 'Automated Test - sitecues proxy',  // name of the test run, for logging purposes
                'selenium-version': '2.45.0',             // request a version, which may not always be respected
                'build': build                            // useful to log success history tied to code changes
            },
            // Places where unit and/or functional tests will be run...
            environments: [
                // local-style...
                // {
                //     browserName: 'phantomjs',  // command line browser, very fast for tests
                //     // pretend to be Chrome, to avoid fallbacks...
                //     'phantomjs.page.settings.userAgent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
                // },
                // { browserName: 'safari' },
                // { browserName: 'firefox' },
                { browserName: 'chrome' }
                // BrowserStack-style...
                // { os: 'Windows', os_version: '10',       browser: 'edge',    browser_version: '12.0' },
                // { os: 'Windows', os_version: '10',       browser: 'firefox', browser_version: '40.0' },
                // { os: 'Windows', os_version: '10',       browser: 'chrome',  browser_version: '44.0' },
                // { os: 'OS X',    os_version: 'Yosemite', browser: 'safari',  browser_version: '8.0' },
                // SauceLabs-style...
                // { platform: 'Windows 10', browserName: 'internet explorer', version: '11' },
                // { platform: 'Windows 10', browserName: 'firefox',           version: '40' },
                // { platform: 'Windows 10', browserName: 'chrome',            version: '44' },
                // { platform: 'OS X 10.10', browserName: 'safari',            version: '8' }
            ],

            maxConcurrency: 3,  // how many browsers may be open at once

            // Specify which AMD module loader to use...
            // loaders: {

            // }
            // Options to pass to the AMD module loader...
            loaderOptions: {
                packages: [
                    { name: 'unit', location: testDir + 'unit' },
                    { name: 'functional', location: testDir + 'functional' }
                ]
            },

            // Each cloud testing service has their own weird quirks and different APIs,
            // so load up the necessary configuration to talk to them...
            tunnel: 'NullTunnel',         // no tunnel (default, if none provided)
            // tunnel: 'BrowserStackTunnel', // BrowserStack
            // tunnel: 'SauceLabsTunnel',    // SauceLabs
            // tunnel: 'TestingBotTunnel',   // TestingBot
            tunnelOptions: {
                host: '127.0.0.1:4447'  // custom location to find the selenium server
                // verbose: true           // more logging, only supported by BrowserStack
            },

            // These are unit tests, which check the APIs of our application...
            suites: testSuites.unit,
            // These are functional tests, which check the user-facing behavior of our application...
            functionalSuites: testSuites.functional,

            // Any test IDs ("suite name - test name") which do NOT match this regex will be skipped...
            grep: /.*/,

            // The paths that match this regex will NOT be included in code coverage reports...
            excludeInstrumentation: /^(?:config|test|node_modules)\//

            // Test result output mechanisms.
            // reporters: ['Pretty']
        };
    }
);
