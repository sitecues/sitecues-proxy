'use strict';

var path    = require('path'),
    fs      = require('fs'),
    directoryFiles;

function getAbsolutePath(filepath) {

    return path.resolve(__dirname, filepath);
}

function getDirectoryFiles(filepath) {

    if (!filepath || typeof filepath !== 'string') {
        filepath = __dirname;  // minor perf optimization vs '' due to path.resolve algorithm
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

    function extensionTest(element, index, validExtensions) {

        if (!caseSensitive) {
            element = element.toLowerCase();
        }

        if (extension === element) {
            return true;
        }
    }

    validExtensions = [
        'js'
    ];

    // removing leading dots so we don't have to include them for every
    // position in our list, and as a bonus, less false negatives...
    extension = extension.replace(findLeadingDots, '');

    if (!caseSensitive) {
        extension = extension.toLowerCase();
    }

    // loop through valid extensions and test our input
    // if the callback returns true, the test passes
    if (validExtensions.some(extensionTest)) {
        result = true;
    }

    return result;
}

function hasValidExtension(filepath, caseSensitive) {

    var extension = getExtension(filepath),  // will be an empty string for .dotfiles
        result = false;

    if (isValidExtension(extension, caseSensitive)) {
        result = true;
    }

    return result;
}

function removeExtension(filepath) {

    var extension, extensionIndex, result = filepath;

    if (filepath && typeof filepath === 'string') {
        extension = getExtension(filepath);  // should be an empty string for .dotfiles
        extensionIndex = filepath.lastIndexOf(extension);
        // just in case extension index is exactly 0, we do not want to cut it off and return an empty string...
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

    if (hasValidExtension(filepath) && !isDotFile(filepath) && !isThisFile(filepath) && isFile(filepath)) {
       result = true;
    }

    return result;
}

function exportFile(filepath) {
    module.exports[getExportName(filepath)] = require(getAbsolutePath(filepath));
}

// get all files in the same directory as this file (including itself)...
directoryFiles = getDirectoryFiles(__dirname);

directoryFiles.forEach(
    function (filepath) {
        if (isExportable(filepath)) {
            exportFile(filepath);
        }
    }
);

// console.log('Exported:', Object.keys(module.exports));
