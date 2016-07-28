'use strict';

const ErrorSubclass = require('error-subclass').default;

class SecurityError extends ErrorSubclass {
    // NOTE: This class is currently empty, but exists,
    // because we want the class name to show up in
    // stack traces, etc. Feel free to implement
    // custom logic here, but do NOT delete the class!
}

module.exports = {
    SecurityError
};
