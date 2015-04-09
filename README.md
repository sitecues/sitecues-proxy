Project
===

The sitecues® Proxy is a web service to effortlessly enable any website with sitecues. It is designed to be super easy-to-use and even a little fun.

Version
---

0.0.1

Architect
---

Seth Holladay


Documentation
---

Coming soon.


Contribution
---

* Generally try to follow Crockford conventions.
* Never commit directly to **master**.
* Code must be reviewed by a previous contributor before pushing to or merging into **master**.
* Must pass npm test before pushing to or merging into **master**.




API
---

Specify what port the proxy runs on:  PORT=8888 npm start
Turn on verbose mode               :  VERBOSE=true npm start

Forward proxy only

  Inject sitecues hosted on a specific IP address (i.e. localhost): IP_ADDRESS=localhost npm start
  Inject a specific branch                                        : BRANCH=x-newpanel npm start
  Inject a specific release                                       : RELEASE=3.1.2 npm start
  Inject a specific dev version                                   : DEV_VERSION=32.673 npm start
  Inject production                                               : PRODUCTION=true npm start
  Set site id                                                     : SITE_ID=0000ee0c npm start