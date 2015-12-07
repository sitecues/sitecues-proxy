// This module is designed to assist in the processing of user input
// to configure a server.

'use strict';

function initConfig(state, config) {
    // TODO: Grab only what we want from the config object, initialize it,
    //       and only then save it to state. The user should probably not
    //       be allowed to set state.phase, for example.
    return Object.assign(state, config);
}

module.exports = initConfig;
