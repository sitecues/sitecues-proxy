// This is the base configuration for the testing framework.
// You can import and extend it for special use cases.

define(
    [],
    () => {
        'use strict';

        const proxyPort = 9000;
        // This path is relative to baseUrl.
        const testDir = '../../test/';
        // Name of the alias to the unit suite directory.
        const unitPkg = 'unit';
        // Name of the alias to the functional suite directory.
        const funcPkg = 'functional';

        return {
            proxyPort,
            proxyUrl : `http://localhost:${proxyPort}/`,

            // Places where unit and/or functional tests will be run.
            environments : [
                // { browserName : 'safari' },
                // { browserName : 'firefox' },
                { browserName : 'chrome' }
            ],

            // How many browsers may be open at once.
            maxConcurrency : 1,

            // Use a custom AMD module loader.
            // loaders : {
            //
            // },
            // Configure the AMD module loader.
            loaderOptions : {
                packages : [
                    {
                        name     : unitPkg,
                        location : testDir + 'unit'
                    },
                    {
                        name     : funcPkg,
                        location : testDir + 'functional'
                    }
                ]
            },

            // The provider for a WebDriver server.
            // tunnel : 'NullTunnel',  // no tunnel (default, if none provided)

            tunnelOptions : {
                // Custom location to find the WebDriver server.
                host : 'localhost:4447'
            },

            // Which unit test suite files to load. These test our APIs.
            suites : [
                unitPkg + '/**/*.js'
            ],
            // Which functional test suite files to load. These test our
            // user-facing behavior.
            functionalSuites : [
                funcPkg + '/**/*.js'
            ],

            // Test whitelist, matched against "suite name - test name".
            // Everything else will be skipped.
            // grep : /.*/,

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
