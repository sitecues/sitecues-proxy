# lib/util/
This directory contains source code modules which the proxy application needs, but which are not directly proxy-related per se. Most of these could / should be spun out into their own, entirely separate applications / projects. It would be appropriate to put them on the npm registry, for example, intellectual property issues aside.

 - **experiment.js**  : These pieces of code aren't ready yet. Be patient.
 - **sitecues-url.js** : Wrapper for Node's url.format(), etc. for working with sitecues project URLs.
 - **load-script.js** : Utility for constructing client-side load scripts.
 - **log.js**         : The proxy needs to do logging. Boom.
