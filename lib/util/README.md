# lib/util/
This directory contains source code which the proxy application needs, but is not directly proxy-related per se. Most of what is in here could / should be spun out into entirely separate projects. It would be appropriate to put them on the npm registry, for example, intellectual property issues aside.

 - **general.js** : Miscellaneous helper functions, some of which can stay with the proxy.
 - **sitecues-url.js** : Wrapper for Node's url.format(), etc. for working with sitecues project URLs.
 - **sitecues-loader.js** : Utility for constructing client-side load scripts.
