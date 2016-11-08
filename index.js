'use strict';

const fs = require('fs');
const path = require('path');
const hoxy = require('hoxy');
const isRoot = require('is-root');
const log = require('./lib/log');
const loader = require('./lib/loader');
const intercept = require('./lib/intercept');

class PageProxy {
    constructor(option) {
        const config = this.config = Object.assign(
            {
                port          : 8000,
                // Async configuration for constructors is a pain.
                /* eslint-disable no-sync */
                loaderFile    : path.join('config', 'loader.html'),
                certAuthority : {
                    key  : fs.readFileSync(path.join(__dirname, 'proxy-ca', 'key', 'proxy-ca.key')),
                    cert : fs.readFileSync(path.join(__dirname, 'proxy-ca', 'cert', 'proxy-ca.cert'))
                }
                /* eslint-enable no-sync */
            },
            option
        );

        if (config.loader && typeof config.loader === 'object') {
            // Turn the loader object into a loader string.
            config.loader = loader.createLoader(config.loader);
        }
        else if (config.loader && typeof config.loader === 'string') {
            // ... noop ...
        }
        else if (config.loaderFile && typeof config.loaderFile === 'string') {
            // Async configuration for constructors is a pain.
            // eslint-disable-next-line no-sync
            config.loader = fs.readFileSync(
                path.resolve(__dirname, config.loaderFile),
                {
                    encoding : 'utf8'
                }
            );
        }
        else {
            throw new Error('Unable to determine a loader to use.');
        }

        const server = this._server = new hoxy.Proxy({
            certAuthority : config.certAuthority
        });

        server.on('error', (err) => {
            // A request came in, but we were unable to map it to a known IP address
            // to send it to.
            if (err.code === 'ENOTFOUND') {
                log.warn('Unable to find an IP address for the target of a request.');
            }
            // A request came in, and we were able to lookup where to send it,
            // but no one was around to answer.
            else if (err.code === 'ECONNREFUSED') {
                log.warn('Unable to connect to the target of a request.');
            }
            // We waited around for a response that did not come in a
            // reasonable amount of time.
            else if (err.code === 'ETIMEDOUT') {
                log.warn('The target is not responding. Giving up.');
            }
            else {
                throw err;
            }
        });

        const onLog = (event) => {
            log[event.level](event.message);
        };

        server.log('warn debug', onLog);
        // Ignore the first info log, of the "server is listening" variety, so that
        // said message can be customized by the user.
        server.once('info', () => {
            server.log('info', onLog);
        });

        // Register handlers for altering data in-transit between the
        // client browser and the target server.

        // Handler for all requests. It flags sessions as tests via headers.
        server.intercept(
            {
                phase    : 'request',
                protocol : /^http/
            },
            intercept.request()
        );

        // Handler for all HTML responses. This is where we add and/or remove
        // Sitecues within the page.
        server.intercept(
            {
                // Construct a DOM from the page.
                as       : '$',
                mimeType : /html/,
                phase    : 'response',
                protocol : /^http/
            },
            intercept.htmlResponse(this)
        );
    }

    start() {
        const server = this._server;
        return new Promise((resolve, reject) => {
            const onError = (err) => {
                if (err.code === 'EACCES') {
                    err.message = `Insufficient privileges to run on port ${this.config.port}.`;
                    if (!isRoot()) {
                        err.message += ' Using sudo may help.';
                    }
                }
                else if (err.code === 'EADDRINUSE') {
                    err.message = `Port ${this.config.port} is already being used by someone.`;
                }

                reject(err);
            };
            // If we get an error before the server is listening, it probably
            // means the port is not available.
            server.once('error', onError);
            server.listen(this.config.port, (err) => {
                if (err) {
                    onError(err);
                    return;
                }

                this.state = Object.assign(
                    {},
                    this.config,
                    {
                        // Provide the final port number we were assigned by the OS, which will be
                        // a random one if the user input was the magic number zero.
                        port : server.address().port
                    }
                );

                resolve();
            });
        });
    }

    stop() {
        const server = this._server;
        return new Promise((resolve, reject) => {
            server.once('error', reject);
            server.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(this);
            });
        });
    }
}

module.exports = PageProxy;
