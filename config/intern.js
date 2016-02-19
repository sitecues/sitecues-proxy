// Herein lies the base configuration for the testing framework.
// Other files can use this as an AMD module.

define(
    [
        'intern',
        '../test/all-unit',
        '../test/all-functional'
    ],
    function (intern, allUnit, allFunctional) {

        'use strict';

        const
            proxyPort = 9000,
            // This path is relative to baseUrl.
            testDir = '../../test/',
            // Name of the alias to the unit suite directory.
            UNIT_PKG = 'unit',
            // Name of the alias to the functional suite directory.
            FUNC_PKG = 'functional';

        let build = 'UNKNOWN';

        if (intern.args.build) {
            build = intern.args.build;
        }

        // Make sure we are in Node and not a browser.
        else if (typeof process === 'object' && process && process.env) {
            build = process.env.BUILD || process.env.COMMIT;
        }

        return {
            proxyPort,
            proxyUrl : `http://localhost:${proxyPort}/`,

            // Miscellaneous configuration, mainly for Selenium.
            // Examples: https://code.google.com/p/selenium/wiki/DesiredCapabilities
            capabilities : {
                name : 'Automated Test - sitecues-proxy',
                build
            },
            // Places where unit and/or functional tests will be run.
            environments : [
                // { browserName : 'safari' },
                // { browserName : 'firefox' },
                { browserName : 'chrome' }
            ],

            // How many browsers may be open at once.
            maxConcurrency : 3,

            // Specify which AMD module loader to use.
            // loaders : {

            // }
            // Options to pass to the AMD module loader.
            loaderOptions : {
                packages : [
                    { name : UNIT_PKG, location : `${testDir}unit` },
                    { name : FUNC_PKG, location : `${testDir}functional` }
                ]
            },

            // Which type of WebDriver session to create.
            tunnel : 'NullTunnel',

            tunnelOptions : {
                // Custom location to find the WebDriver server.
                host : 'localhost:4447'
                // Extra logging, only supported by BrowserStack.
                // verbose : true
            },

            // Which unit test suite files to load. These test our APIs.
            suites : allUnit.map((suite) => {
                return `${UNIT_PKG}/${suite}`;
            }),
            // Which functional test suite files to load. These test our
            // user-facing behavior.
            functionalSuites : allFunctional.map((suite) => {
                return `${FUNC_PKG}/${suite}`;
            }),

            // Test whitelist, matched against "suite name - test name".
            // Everything else will be skipped.
            grep : /.*/,

            // Ignore some code for test coverage reports, even if it loads
            // during testing. The paths that match this pattern will NOT
            // count against coverage.
            excludeInstrumentation : /^(?:config|test|node_modules)\//

            // How to display or save test run info.
            // reporters : [
            //     // Test result reporters.
            //     { id : 'Runner' }
            //     // { id : 'JUnit',    filename : 'report/test/junit.xml' },
            //     // // Code coverage reporters.
            //     // { id : 'Cobertura', filename  : 'report/coverage/info/cobertura.info' },
            //     // { id : 'Lcov',      filename  : 'report/coverage/info/lcov.info' },
            //     // { id : 'LcovHtml',  directory : 'report/coverage/html' }
            // ]
        };
    }
);
