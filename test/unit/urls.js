// This file is used as a unit test for the sitecues-url module.

define(
    [
        'intern!tdd',
        'intern/chai!assert',
        'intern/dojo/node!../../../../lib/util/sitecues-url'
    ],
    (tdd, assert, sitecuesUrl) => {
        'use strict';

        const { suite, test } = tdd;

        suite('basics', () => {
            test('environments', () => {
                // The environment must be respected when formatting the host.
                assert.strictEqual(
                    sitecuesUrl({
                        environment : 'local'
                    }),
                    '//localhost/l/s;id=s-00000005/js/sitecues.js'
                );
                assert.strictEqual(
                    sitecuesUrl({
                        environment : 'dev'
                    }),
                    '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );
                assert.strictEqual(
                    sitecuesUrl({
                        environment : 'prod'
                    }),
                    '//js.sitecues.com/l/s;id=s-00000005/js/sitecues.js'
                );

                // The environment must be respected when formatting the host,
                // even if it is an alias.
                assert.strictEqual(
                    sitecuesUrl({
                        environment : 'localhost'
                    }),
                    '//localhost/l/s;id=s-00000005/js/sitecues.js'
                );
            });

            // -------------------- test boundary ------------

            test('environment', () => {
                // The port must be respected when formatting the host.
                assert.strictEqual(
                    sitecuesUrl({
                        environment : 'local',
                        port        : '8888'
                    }),
                    '//localhost:8888/l/s;id=s-00000005/js/sitecues.js'
                );

                // The port must be respected, even as a number, when formatting the host.
                assert.strictEqual(
                    sitecuesUrl({
                        environment : 'local',
                        port        : 8888
                    }),
                    '//localhost:8888/l/s;id=s-00000005/js/sitecues.js'
                );
            });

            // -------------------- test boundary ------------

            test('hostnames', () => {
                // NO MATCH, NO ENVIRONMENT EXPANSION
                assert.strictEqual(
                    sitecuesUrl({
                        hostname : 'foo'
                    }),
                    '//foo/l/s;id=s-00000005/js/sitecues.js',
                    'Simple hostnames must be allowed.'
                );
                assert.strictEqual(
                    sitecuesUrl({
                        hostname : 'foo.com'
                    }),
                    '//foo.com/l/s;id=s-00000005/js/sitecues.js'
                );

                // ENVIRONMENT EXPANSION

                assert.strictEqual(
                    sitecuesUrl({
                        hostname : 'dev'
                    }),
                    '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );
                // Respect protocol.
                assert.strictEqual(
                    sitecuesUrl({
                        hostname : 'dev',
                        protocol : 'https'
                    }),
                    'https://js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );

                // Handle port numbers, not just strings.
                assert.strictEqual(
                    sitecuesUrl({
                        hostname : 'foo.com',
                        port     : 8888
                    }),
                    '//foo.com:8888/l/s;id=s-00000005/js/sitecues.js'
                );
            });

            // -------------------- test boundary ------------

            test('hosts', () => {
                // NO MATCH, NO ENVIRONMENT EXPANSION
                assert.strictEqual(
                    sitecuesUrl({
                        host : 'foo'
                    }),
                    '//foo/l/s;id=s-00000005/js/sitecues.js'
                );

                assert.strictEqual(
                    sitecuesUrl({
                        host : 'foo.com'
                    }),
                    '//foo.com/l/s;id=s-00000005/js/sitecues.js'
                );

                // ENVIRONMENT EXPANSION

                assert.strictEqual(
                    sitecuesUrl({
                        host : 'dev'
                    }),
                    '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );

                // NO MATCH, NO ENVIRONMENT EXPANSION

                assert.strictEqual(
                    sitecuesUrl({
                        host : 'foo:8888'
                    }),
                    '//foo:8888/l/s;id=s-00000005/js/sitecues.js'
                );

                assert.strictEqual(
                    sitecuesUrl({
                        host : 'foo.com:8888'
                    }),
                    '//foo.com:8888/l/s;id=s-00000005/js/sitecues.js'
                );

                // ENVIRONMENT EXPANSION

                assert.strictEqual(
                    sitecuesUrl({
                        host : 'dev:8888'
                    }),
                    '//js.dev.sitecues.com:8888/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );

                // Ignore port, host trumps it.
                assert.strictEqual(
                    sitecuesUrl({
                        host : 'dev',
                        port : '8888'
                    }),
                    '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );

                // Ignore port, host trumps it, plus it already has one.
                assert.strictEqual(
                    sitecuesUrl({
                        host : 'dev:8888',
                        port : '4444'
                    }),
                    '//js.dev.sitecues.com:8888/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );

                // Sanitize weird input.
                assert.strictEqual(
                    sitecuesUrl({
                        host : 'dev:'
                    }),
                    '//js.dev.sitecues.com/l/s;id=s-00000005/dev/latest/js/sitecues.js'
                );

                assert.strictEqual(
                    sitecuesUrl({
                        host : 'foo:'
                    }),
                    '//foo/l/s;id=s-00000005/js/sitecues.js'
                );
            });
        });
    }
);
