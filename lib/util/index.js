//
// This module exports a property for every sibling file
// within its dsirectory, so that you can access them
// all with a single require() call.
//

'use strict';

var path    = require('path'),
    fs      = require('fs'),
    directoryFiles;

function getAbsolutePath(filepath) {

    if (!filepath || typeof filepath !== 'string') {
        // Minor perf optimization vs '' due to path.resolve algorithm.
        filepath = __dirname;
    }

    return path.resolve(__dirname, filepath);
}

function getDirectoryFiles(filepath) {

    if (!filepath || typeof filepath !== 'string') {
        // Minor perf optimization vs '' due to path.resolve algorithm.
        filepath = __dirname;
    }

    return fs.readdirSync(getAbsolutePath(filepath));
}

function getExtension(filepath) {

    return path.extname(filepath);
}

function isValidExtension(extension, caseSensitive) {

    var findLeadingDots = /^\.+/,
        validExtensions,
        result = false;

    // Strip leading dots so we don't have to include them everywhere
    // in our list. And as a bonus, less false negatives.
    extension = extension.replace(findLeadingDots, '');

    if (!caseSensitive) {
        extension = extension.toLowerCase();
    }

    validExtensions = [
        'js'
    ];

    function extensionTest(validExtension) {

        if (!caseSensitive) {
            validExtension = validExtension.toLowerCase();
        }

        return extension === validExtension;
    }

    // Check our input against all valid extensions we defined.
    // If the callback returns true, the test passes.
    result = validExtensions.some(extensionTest);

    return result;
}

function hasValidExtension(filepath, caseSensitive) {

    // Will be an empty string for .dotfiles
    var extension = getExtension(filepath),
        result = false;

    if (isValidExtension(extension, caseSensitive)) {
        result = true;
    }

    return result;
}

function removeExtension(filepath) {

    var extension, extensionIndex, result = filepath;

    if (filepath && typeof filepath === 'string') {
        // Will be an empty string for .dotfiles
        extension = getExtension(filepath);
        extensionIndex = filepath.lastIndexOf(extension);
        // Just in case extension index is 0 or less, we do not want
        // to cut it off and return an empty string.
        if (extensionIndex > 0) {
            result = filepath.substring(0, extensionIndex);
        }
    }

    return result;
}

function isThisFile(filepath) {

    return getAbsolutePath(filepath) === __filename;
}

function isFile(filepath) {

    return fs.statSync(getAbsolutePath(filepath)).isFile();
}

function getExportName(filepath) {
    // gets the filename only, without the extension...
    return path.basename(filepath, getExtension(filepath));
}

function isDotFile(filepath) {
    return path.basename(filepath)[0] === '.';
}

function isExportable(filepath) {

    var result = false;

    if (hasValidExtension(filepath) &&
        !isDotFile(filepath)        &&
        !isThisFile(filepath)       &&
        isFile(filepath)) {

        result = true;
    }

    return result;
}

function exportFile(filepath) {

    var absolutePath = getAbsolutePath(filepath),
        exportName   = getExportName(filepath);

    module.exports[exportName] = require(absolutePath);
}

function processFiles(filepath) {
    if (isExportable(filepath)) {
        exportFile(filepath);
    }
}

// Get all files in the same directory as this file (including itself).
directoryFiles = getDirectoryFiles(__dirname);

directoryFiles.forEach(processFiles);

// console.log('Exported:', Object.getOwnPropertyNames(module.exports));
