// This file is used as a unit test for the sitecues-url module.

define(
    [   // Dependencies.
        'intern!tdd',          // the testing interface - defines how we register suites and tests
        'intern/chai!assert',  // helps throw errors to fail tests, based on conditions
        'intern/dojo/node!../../../../lib/util/sitecues-url'  // Node's filesystem API, used to save screenshots
    ],
    function (tdd, assert, sitecuesUrl) {
        with (tdd) {
            suite('basics', function () {
                // Code to run when the suite starts, before tests...
                before(
                    function () {
                    }
                )
                // Code to run before each test, including the first one...
                beforeEach(
                    function () {
                    }
                )
                // Code to run after each test, including the last one...
                afterEach(
                    function () {
                    }
                );
                // Code to run after all tests, before the suite exits...
                after(
                    function () {
                    }
                );

                test('environments', function () {
                    // The environment must be respected when formatting the host.
                    assert.strictEqual(
                        sitecuesUrl(
                            {environment:'local'}
                        ),
                        '//localhost/l/s;id=s-00000005/js/sitecues.js'
                    );
                    assert.strictEqual(
                        sitecuesUrl(
                            {environment:'dev'}
                        ),
                        '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );
                    assert.strictEqual(
                        sitecuesUrl(
                            {environment:'prod'}
                        ),
                        '//js.sitecues.com/l/s;id=s-00000005/js/sitecues.js'
                    );

                    // The environment must be respected when formatting the host,
                    // even if it is an alias.
                    assert.strictEqual(
                        sitecuesUrl(
                            {environment:'localhost'}
                        ),
                        '//localhost/l/s;id=s-00000005/js/sitecues.js'
                    );
                });

                /////////////////////////////// ------- test boundary -------

                test('environment', function () {
                    // The port must be respected when formatting the host.
                    assert.strictEqual(
                        sitecuesUrl(
                            {environment:'local', port:'8888'}
                        ),
                        '//localhost:8888/l/s;id=s-00000005/js/sitecues.js'
                    );

                    // The port must be respected, even as a number, when formatting the host.
                    assert.strictEqual(
                        sitecuesUrl(
                            {environment:'local', port:8888}
                        ),
                        '//localhost:8888/l/s;id=s-00000005/js/sitecues.js'
                    );
                });

                /////////////////////////////// ------- test boundary -------

                test('hostnames', function () {
                    ////// NO MATCH, NO ENVIRONMENT EXPANSION

                    // Simple hostnames must be allowed.
                    assert.strictEqual(
                        sitecuesUrl(
                            {hostname:'foo'}
                        ),
                        '//foo/l/s;id=s-00000005/js/sitecues.js'
                    );
                    assert.strictEqual(
                        sitecuesUrl(
                            {hostname:'foo.com'}
                        ),
                        '//foo.com/l/s;id=s-00000005/js/sitecues.js'
                    );

                    ////// ENVIRONMENT EXPANSION

                    //
                    assert.strictEqual(
                        sitecuesUrl(
                            {hostname:'dev'}
                        ),
                        '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );
                    // Respect protocol.
                    assert.strictEqual(
                        sitecuesUrl(
                            {hostname:'dev', protocol:'https'}
                        ),
                        'https://js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );

                    // Handle port numbers, not just strings.
                    assert.strictEqual(
                        sitecuesUrl(
                            {hostname:'foo.com', port:8888}
                        ),
                        '//foo.com:8888/l/s;id=s-00000005/js/sitecues.js'
                    );
                });

                /////////////////////////////// ------- test boundary -------

                test('hosts', function () {
                    ////// NO MATCH, NO ENVIRONMENT EXPANSION

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'foo'}
                        ),
                        '//foo/l/s;id=s-00000005/js/sitecues.js'
                    );

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'foo.com'}
                        ),
                        '//foo.com/l/s;id=s-00000005/js/sitecues.js'
                    );

                    ////// ENVIRONMENT EXPANSION

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'dev'}
                        ),
                        '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );

                    ////// NO MATCH, NO ENVIRONMENT EXPANSION

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'foo:8888'}
                        ),
                        '//foo:8888/l/s;id=s-00000005/js/sitecues.js'
                    );

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'foo.com:8888'}
                        ),
                        '//foo.com:8888/l/s;id=s-00000005/js/sitecues.js'
                    );

                    ////// ENVIRONMENT EXPANSION

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'dev:8888'}
                        ),
                        '//js.dev.sitecues.com:8888/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );

                    // Ignore port, host trumps it.
                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'dev', port:'8888'}
                        ),
                        '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );

                    // Ignore port, host trumps it, plus it already has one.
                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'dev:8888', port:'4444'}
                        ),
                        '//js.dev.sitecues.com:8888/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );

                    // Sanitize weird input.
                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'dev:'}
                        ),
                        '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                    );

                    assert.strictEqual(
                        sitecuesUrl(
                            {host:'foo:'}
                        ),
                        '//foo/l/s;id=s-00000005/js/sitecues.js'
                    );
                });
            });
        }
    }
);
