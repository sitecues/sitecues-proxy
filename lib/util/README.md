# lib/util/

This directory contains code that the proxy needs but is not directly proxy-related per se. Most of what is in here could / should be spun out into entirely separate projects. It would be appropriate to put them on the npm registry, for example (intellectual property issues aside).

 - **is-eligible.js** : Prevent the proxy from injecting Sitecues on specific URLs.
 - **sitecues-url.js** : Like Node's url.format() but meant for working with sitecues project URLs.
 - **sitecues-loader.js** : Utility for constructing client-side load scripts.
