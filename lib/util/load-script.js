var sitecuesUrl = require('./sitecues-url');

function toString() {
    return this.value;
}

function LoadScript(options) {

    var optionsType = typeof options, urlOpts, scriptUrl, result;

    // Defensive: Object.create does not like undefined, etc. so we
    // give it a blank slate to start with in edge cases.
    if (!options || (optionsType !== 'object' && optionsType !== 'function')) {
        options = Object.prototype;
    }

    urlOpts = Object.create(options);
    // Overrides. These are unique to how we want the script url
    // processed on the client side.
    urlOpts.siteId = '\'+sitecues.config.site_id+\'';
    urlOpts.protocol = undefined;

    // Defensive: In case .sanitize() stops being indempotent,
    // we should keep setting the script url first.
    scriptUrl = sitecuesUrl(urlOpts);

    this.options = options = sitecuesUrl.sanitize(options);

    result =
        '\n        <script data-provider=\"' + options.provider + '\" type=\"text/javascript\">\n' +
        '            // DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES\n'     +
        '            var sitecues = window.sitecues || {};\n'                             +
        '            sitecues.config = sitecues.config || {};\n'                          +
        '            sitecues.config.site_id = \'' + options.siteId + '\';\n'             +
        '            (function () {\n'                                                    +
        '                var script = document.createElement(\'script\'),\n'              +
        '                first = document.getElementsByTagName(\'script\')[0];\n'         +
        '                sitecues.config.script_url=document.location.protocol+'          +
                             '\''+ scriptUrl +'\';\n'                                     +
        '                script.type = \'text/javascript\';\n'                            +
        '                script.async = true;\n'                                          +
        '                script.src=sitecues.config.script_url;\n'                        +
        '                first.parentNode.insertBefore(script, first);\n'                 +
        '            })();\n'                                                             +
        '        </script>\n    ';

    this.value = result;
}

LoadScript.prototype.toString = toString;

module.exports = LoadScript;