# sitecues-proxy [![Build status for sitecues-proxy on Circle CI.](https://img.shields.io/circleci/project/sitecues/sitecues-proxy/master.svg "Circle Build Status")](https://circleci.com/gh/sitecues/sitecues-proxy "Sitecues Proxy Builds")

> Intercept webpages to add or remove Sitecues.

## Why?

 - Enables testing on potential and existing customer sites.
 - Reliable simulation, happening at the network layer.
 - Powerful and easy to use.

## Install

As a dependency:

```sh
npm install sitecues/sitecues-proxy --save
```

As a project to work on:

```sh
git clone git@github.com:sitecues/sitecues-proxy.git &&
cd sitecues-proxy &&
npm link
```

## Usage

```
$ proxy --help

  Usage
    $ proxy

  Option
    --port <number>            Listen on a custom port for requests.
    --open <url>               Open a URL in your browser.
    --loader <string>          Code to inject into HTML responses.
    --loaderFile <path>        Filepath to find a loader.
    --loaderStrategy <string>  What to do with loaders.
    --logLevel <level>         Amount of program info to output.

  Example
    $ proxy
    The Sitecues® Proxy is on port 8000.
    $ proxy --port=8888
    The Sitecues® Proxy is on port 8888.
```

Control how quiet or noisy the proxy logs are. Uses [npm levels](https://github.com/winstonjs/winston/blob/master/lib/winston/config/npm-config.js), possible values are `error`, `warn`, `info`, `verbose`, `debug`, `silly`.

```
$ proxy --logLevel=debug
```

### Loader Options

**The following options control the Sitecues loader added to pages. They do not control the proxy itself.**

Load a specific branch.

```
$ proxy --branch=master
```

Load a specific version.

```
$ proxy --build=1.0.0
```

Imitate a specific customer.

```
$ proxy --siteId=s-0000ee0c
```

Load from a specific server.

```
$ proxy --jsHost=localhost
```

## API

### Proxy(option)

#### option

Type: `object`

Settings for the new proxy instance.

##### port

Type: `number`<br>
Default: `8000`

The port number to listen on for requests.

##### loader

Type: `string`

A piece of code to inject into webpages. Takes precedence over `loaderFile`.

##### loaderFile

Type: `string`<br>
Default: `config/loader.html`

A filepath to find a loader, when `loader` is not provided.

##### loaderStrategy

Type: `string`<br>
Default: `replace`

What to do with loaders that are provided and ones that are encountered on webpages.

| Strategy  | Description                                                    |
|-----------|----------------------------------------------------------------|
| `add`     | Always inject the provided loader, no matter what.             |
| `remove`  | Simply remove any loaders on the page and do nothing else.     |
| `keep`    | Inject the provided loader only if the page does not have one. |
| `replace` | Ensure the page loads with only the provided loader.           |

### Instance

#### .start()

Listen for requests.

#### .stop()

Stop the proxy from listening.

## Contributing

See our [contributing guidelines](https://github.com/sitecues/sitecues-proxy/blob/master/CONTRIBUTING.md "The guidelines for participating in this project.") for more details.

1. [Fork it](https://github.com/sitecues/sitecues-proxy/fork).
2. Make a feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. [Submit a pull request](https://github.com/sitecues/sitecues-proxy/compare "Submit code to this project for review.").

## License

Copyright © [Sitecues](https://sitecues.com "Owner of sitecues-proxy."). All rights reserved.
