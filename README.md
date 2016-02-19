# sitecues Proxy

A web server that sits between you and a website, to add or remove sitecues.

 - General testing
 - Code debugging
 - Quality assurance

**Version**: `0.1.0`    
**Documentation**: [The sitecues&reg; Proxy](https://equinox.atlassian.net/wiki/pages/viewpage.action?pageId=36241450 "Documentation for the sitecues Proxy.")    
**Author**: [Seth Holladay](http://seth-holladay.com "Personal website for Seth Holladay.")

Note: simple instructions for testers here: https://equinox.atlassian.net/wiki/display/EN/Using+the+forward+proxy+to+test

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

How to inject the loader script (default is replace)
````sh
LOADER_STRATEGY=keep      # Keep the original loader if present, otherwise append the new loader to the head. TODO should we remove?
LOADER_STRATEGY=add       # Append the new loader to the head. Any old loaders are note removed -- they are kept where they were. Helpful for testing what happens when there are 2 sitecues scripts on the page.
LOADER_STRATEGY=remove    # Remove the old loader and don't replace it -- strips out sitecues. Helpful for testing whether a bug is in the website itself or in sitecues.
LOADER_STRATEGY=replace   # (default) Replace the old loader where is in the document

````

Inject a specific load script such as config/local-loader.html (uses config/loader.html by default, for the latest production version)
````sh
LOADER_FILE=filename npm start
````

Inject a specific branch and/or version (default BRANCH is dev. default VERSION is latest).
````sh
LOADER_FILE=config/dev-loader.html BRANCH=(some branch name) VERSION=(some version number) npm start
````

Inject a specific release candidate, deployed by CI (no default for VERSION).
````sh
LOADER_FILE=config/release-loader.html VERSION=3.1.2 npm start
````

Specify a hostname to associate the proxy with (default JS_HOSTNAME is localhost).
````sh
LOADER_FILE=config/local-loader.html JS_HOSTNAME=localhost npm start
````

Set a specific string used to identify customer sites. 
Otherwise, the site id will be scraped from the existing site. If none is found, then a default site id is used.
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
