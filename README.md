# sitecues Proxy

A web server that sits between you and a website, to add or remove sitecues.

 - General testing
 - Code debugging
 - Quality assurance

**Version**: `0.1.0`    
**Documentation**: [The sitecues&reg; Proxy](https://equinox.atlassian.net/wiki/pages/viewpage.action?pageId=36241450 "Documentation for the sitecues Proxy.")    
**Author**: [Seth Holladay](http://seth-holladay.com "Personal website for Seth Holladay.")

## Installation

Download the project.
````sh
git clone git@bitbucket.org:ai_squared/sitecues-proxy.git
````

Move into its shiny new home.
````sh
cd sitecues-proxy
````

For convenience, so you may use the proxy from any directory, you probably want to put it in your [`$PATH`](http://www.linfo.org/path_env_var.html "Description of the PATH environment variable.").
````sh
npm link
````

Now you can run `sitecues-proxy` from anywhere on the command line. It is equivalent to `npm start` seen below, but that command only works inside of the project directory, because it is intentionally relative to the nearest [package.json](https://docs.nodejitsu.com/articles/getting-started/npm/what-is-the-file-package-json "Description of the package.json file.") in or above the current working directory.

## Usage
At the moment, all settings on the command line are given via environment variables. Don't confuse these with arguments, they have different syntax and (by convention) must be uppercase with underscores, like `A_CONSTANT`.

If using the proxy programmatically by `require()`ing it, then you may pass an options object with camelCase properties, which will take precedence.

Eventually, we will bake in a module to normalize all of this so you don't really have to care.

Run the proxy on a desired port.
````sh
PORT=8888 npm start
````

Specify a hostname to associate the proxy with.
````sh
HOSTNAME=localhost npm start
````

Specify a complete `host` to associate the proxy with. Takes precedence over the less specific `hostname` or `port`.
````sh
HOST=localhost:8000 npm start
````

Control how quiet or noisy the proxy logs should be.
````sh
LOG_LEVEL=debug npm start
````

Demand that the proxy log level be *at least* `verbose` (may be more noisy).
````sh
VERBOSE=true npm start
````

### sitecues Loader Options

**The following options control the sitecues load script added to pages. They do not control the proxy itself.**

Inject a specific branch.
````sh
BRANCH=x-newpanel npm start
````

Inject a specific release candidate, deployed by CI.
````sh
RELEASE=3.1.2 npm start
````

Inject a specific development version, deployed by CI.
````sh
DEV_VERSION=32.673 npm start
````

Load sitecues from the production servers.
````sh
PRODUCTION=true npm start
````

Set the string used to identify customer sites.
````sh
SITE_ID=0000ee0c npm start
````

## Contribution
* Generally try to follow [Crockford conventions](http://javascript.crockford.com/code.html "Douglas Crockford's recommendations for JavaScript code style.").
* Never commit directly to **master**.
* Code must be reviewed by a previous contributor before pushing to or merging into **master**.
* Must pass npm test before pushing to or merging into **master**.

1. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. [Submit a pull request](https://bitbucket.org/ai_squared/sitecues-proxy/pull-request/new "Submit your code to be merged in, pending a review.").

## License
[MPL-2.0](https://www.mozilla.org/MPL/2.0/ "The license for the sitecues Proxy.")

Go make something, dang it.
